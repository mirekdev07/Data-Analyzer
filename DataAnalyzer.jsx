import React, { useState, useCallback, useMemo, useRef } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

/* ----------------------------- design tokens ----------------------------- */
const C = {
  bg: "#0d0e0c",
  surface: "#151714",
  elevated: "#1c1f1a",
  border: "#2a2d27",
  text: "#ECECE4",
  muted: "#8b8f84",
  faint: "#5c6056",
  accent: "#C7F051",      // chartreuse
  accent2: "#F2845C",     // coral (categorical)
  accent3: "#6BC5E8",     // sky (dates)
  danger: "#E8675C",
};
const palette = ["#C7F051", "#F2845C", "#6BC5E8", "#E0B85C", "#B58CF0", "#7FE0A8"];

const fonts = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
@keyframes rise { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:none;} }
.da-rise { animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
::-webkit-scrollbar{height:8px;width:8px}
::-webkit-scrollbar-thumb{background:#2a2d27;border-radius:8px}
`;

/* ------------------------------ type helpers ------------------------------ */
const DATE_RE = /^\d{4}-\d{1,2}-\d{1,2}([ T]\d|$)|^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/;

function detectType(values) {
  const v = values.filter((x) => x !== null && x !== undefined && x !== "");
  if (v.length === 0) return "empty";
  const isNum = v.every((x) => typeof x === "number" || (typeof x === "string" && x.trim() !== "" && !isNaN(Number(x))));
  if (isNum) return "number";
  const isBool = v.every((x) => x === true || x === false || x === "true" || x === "false");
  if (isBool) return "boolean";
  const isDate = v.every((x) => typeof x === "string" && DATE_RE.test(x.trim()) && !isNaN(Date.parse(x)));
  if (isDate) return "date";
  const unique = new Set(v.map(String)).size;
  if (unique <= 25 || unique / v.length < 0.5) return "category";
  return "text";
}

function numericStats(values) {
  const nums = values.map(Number).filter((x) => !isNaN(x)).sort((a, b) => a - b);
  const n = nums.length;
  if (!n) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 ? nums[(n - 1) / 2] : (nums[n / 2 - 1] + nums[n / 2]) / 2;
  const variance = n > 1 ? nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const min = nums[0], max = nums[n - 1];
  const binCount = Math.min(12, Math.max(5, Math.round(Math.sqrt(n))));
  const width = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    label: fmt(min + i * width),
    count: 0,
  }));
  nums.forEach((x) => {
    let idx = Math.floor((x - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  });
  return { n, mean, median, std: Math.sqrt(variance), min, max, bins };
}

function categoryStats(values) {
  const counts = {};
  values.forEach((x) => {
    if (x === null || x === undefined || x === "") return;
    const k = String(x);
    counts[k] = (counts[k] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    unique: sorted.length,
    top: sorted.slice(0, 8).map(([label, count]) => ({ label, count })),
  };
}

function dateStats(values) {
  const ts = values.map((x) => Date.parse(x)).filter((x) => !isNaN(x)).sort((a, b) => a - b);
  if (!ts.length) return null;
  const buckets = {};
  ts.forEach((t) => {
    const d = new Date(t);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = (buckets[key] || 0) + 1;
  });
  return {
    min: new Date(ts[0]).toISOString().slice(0, 10),
    max: new Date(ts[ts.length - 1]).toISOString().slice(0, 10),
    series: Object.entries(buckets).map(([label, count]) => ({ label, count })),
  };
}

/* ------------------------------- formatting ------------------------------- */
function fmt(x) {
  if (typeof x !== "number" || isNaN(x)) return String(x);
  if (Math.abs(x) >= 1e6 || (Math.abs(x) < 0.01 && x !== 0)) return x.toExponential(2);
  if (Number.isInteger(x)) return x.toLocaleString("pl-PL");
  return x.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
}

/* ------------------------------ data flatten ------------------------------ */
function normalizeJSON(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const arrKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
    if (arrKey) return parsed[arrKey];
    return [parsed];
  }
  return [];
}
function flattenRow(row, prefix = "", out = {}) {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    out[prefix || "value"] = Array.isArray(row) ? row.join(", ") : row;
    return out;
  }
  for (const [k, val] of Object.entries(row)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (val && typeof val === "object" && !Array.isArray(val)) flattenRow(val, key, out);
    else out[key] = Array.isArray(val) ? val.join(", ") : val;
  }
  return out;
}

/* -------------------------------- sample ---------------------------------- */
const SAMPLE = JSON.stringify([
  { id: 1, kraj: "Polska", produkt: "Laptop", cena: 3499, ilosc: 12, data: "2024-01-15" },
  { id: 2, kraj: "Niemcy", produkt: "Telefon", cena: 2199, ilosc: 30, data: "2024-01-22" },
  { id: 3, kraj: "Polska", produkt: "Tablet", cena: 1599, ilosc: 8, data: "2024-02-03" },
  { id: 4, kraj: "Francja", produkt: "Laptop", cena: 4199, ilosc: 5, data: "2024-02-19" },
  { id: 5, kraj: "Niemcy", produkt: "Laptop", cena: 3899, ilosc: 15, data: "2024-03-01" },
  { id: 6, kraj: "Polska", produkt: "Telefon", cena: 1999, ilosc: 22, data: "2024-03-12" },
  { id: 7, kraj: "Hiszpania", produkt: "Tablet", cena: 1399, ilosc: 18, data: "2024-04-05" },
  { id: 8, kraj: "Polska", produkt: "Laptop", cena: 3299, ilosc: 9, data: "2024-04-20" },
  { id: 9, kraj: "Niemcy", produkt: "Tablet", cena: 1799, ilosc: 14, data: "2024-05-08" },
  { id: 10, kraj: "Francja", produkt: "Telefon", cena: 2499, ilosc: 27, data: "2024-05-19" },
]);

/* ================================== APP =================================== */
export default function App() {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const parse = useCallback((text, name) => {
    setError("");
    try {
      const isJSON = name.toLowerCase().endsWith(".json") || text.trim().startsWith("{") || text.trim().startsWith("[");
      let data;
      if (isJSON) {
        data = normalizeJSON(JSON.parse(text)).map((r) => flattenRow(r));
      } else {
        const res = Papa.parse(text.trim(), { header: true, dynamicTyping: true, skipEmptyLines: true });
        if (res.errors.length && !res.data.length) throw new Error(res.errors[0].message);
        data = res.data;
      }
      if (!data.length) throw new Error("Plik nie zawiera żadnych rekordów.");
      setRows(data);
      setFileName(name);
    } catch (e) {
      setError("Nie udało się odczytać pliku: " + e.message);
      setRows(null);
    }
  }, []);

  const onFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => parse(e.target.result, file.name);
    reader.readAsText(file);
  }, [parse]);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  const columns = useMemo(() => {
    if (!rows) return [];
    const keys = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set()));
    return keys.map((key) => {
      const values = rows.map((r) => r[key]);
      const missing = values.filter((v) => v === null || v === undefined || v === "").length;
      return { key, type: detectType(values), values, missing };
    });
  }, [rows]);

  const overview = useMemo(() => {
    if (!rows) return null;
    const cells = rows.length * columns.length;
    const missing = columns.reduce((a, c) => a + c.missing, 0);
    return { rows: rows.length, cols: columns.length, missing, missingPct: cells ? (missing / cells) * 100 : 0 };
  }, [rows, columns]);

  /* ------------------------------- render ------------------------------- */
  return (
    <div style={{ background: C.bg, minHeight: "100%", color: C.text, fontFamily: "'Hanken Grotesk',sans-serif",
      backgroundImage: `radial-gradient(${C.border} 1px, transparent 1px)`, backgroundSize: "26px 26px" }}>
      <style>{fonts}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* header */}
        <div className="da-rise" style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
          <div style={{ width: 12, height: 12, background: C.accent, borderRadius: 3, transform: "rotate(45deg)" }} />
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 38, margin: 0, letterSpacing: -1 }}>
            Data&nbsp;Analyzer
          </h1>
        </div>
        <p className="da-rise" style={{ color: C.muted, margin: "0 0 32px", fontSize: 15 }}>
          Wrzuć plik CSV lub JSON — wykryję strukturę, typy kolumn i wygeneruję statystyki.
        </p>

        {/* dropzone */}
        {!rows && (
          <div
            className="da-rise"
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `1.5px dashed ${drag ? C.accent : C.border}`,
              background: drag ? "rgba(199,240,81,.05)" : C.surface,
              borderRadius: 16, padding: "56px 24px", textAlign: "center", cursor: "pointer",
              transition: "all .2s",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>⤓</div>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 20 }}>
              Przeciągnij plik tutaj
            </div>
            <div style={{ color: C.muted, marginTop: 6, fontSize: 14 }}>
              albo kliknij, aby wybrać &nbsp;·&nbsp; .csv, .json
            </div>
            <input ref={inputRef} type="file" accept=".csv,.json,.tsv,.txt" style={{ display: "none" }}
              onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
            <div style={{ marginTop: 22 }}>
              <button
                onClick={(e) => { e.stopPropagation(); parse(SAMPLE, "przyklad_sprzedaz.json"); }}
                style={{ background: C.accent, color: "#0d0e0c", border: "none", padding: "9px 18px",
                  borderRadius: 9, fontWeight: 700, cursor: "pointer", fontSize: 13.5, fontFamily: "inherit" }}>
                Wypróbuj na przykładzie →
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(232,103,92,.1)", border: `1px solid ${C.danger}`, color: C.danger,
            padding: "12px 16px", borderRadius: 10, marginTop: 16, fontSize: 14 }}>{error}</div>
        )}

        {/* results */}
        {rows && overview && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, background: C.elevated,
                  border: `1px solid ${C.border}`, padding: "4px 10px", borderRadius: 7, color: C.muted }}>
                  {fileName}
                </span>
              </div>
              <button onClick={() => { setRows(null); setError(""); }}
                style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`,
                  padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                ↺ Nowy plik
              </button>
            </div>

            {/* overview cards */}
            <div className="da-rise" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 12, marginBottom: 28 }}>
              <Stat label="Wiersze" value={fmt(overview.rows)} accent={C.accent} />
              <Stat label="Kolumny" value={fmt(overview.cols)} accent={C.accent3} />
              <Stat label="Braki danych" value={fmt(overview.missing)} accent={C.accent2} />
              <Stat label="% kompletności" value={(100 - overview.missingPct).toFixed(1) + "%"} accent={C.accent} />
            </div>

            {/* column cards */}
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, color: C.muted,
              textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, margin: "0 0 14px" }}>
              Kolumny ({columns.length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16, marginBottom: 36 }}>
              {columns.map((c, i) => <ColumnCard key={c.key} col={c} delay={i * 0.04} />)}
            </div>

            <PreviewTable rows={rows} columns={columns} />
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- sub views -------------------------------- */
function Stat({ label, value, accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ color: C.muted, fontSize: 12.5, letterSpacing: .3 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26, fontWeight: 700, marginTop: 6, color: accent }}>
        {value}
      </div>
    </div>
  );
}

const TYPE_META = {
  number: { c: C.accent, t: "liczba" },
  category: { c: C.accent2, t: "kategoria" },
  date: { c: C.accent3, t: "data" },
  boolean: { c: "#B58CF0", t: "logiczna" },
  text: { c: C.muted, t: "tekst" },
  empty: { c: C.faint, t: "pusta" },
};

function ColumnCard({ col, delay }) {
  const meta = TYPE_META[col.type] || TYPE_META.text;
  const stats = useMemo(() => {
    if (col.type === "number") return numericStats(col.values);
    if (col.type === "category" || col.type === "boolean") return categoryStats(col.values);
    if (col.type === "date") return dateStats(col.values);
    return null;
  }, [col]);

  return (
    <div className="da-rise" style={{ animationDelay: `${delay}s`, background: C.surface,
      border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14, color: C.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{col.key}</span>
        <span style={{ fontSize: 11, color: meta.c, border: `1px solid ${meta.c}55`, padding: "2px 8px",
          borderRadius: 20, whiteSpace: "nowrap" }}>{meta.t}</span>
      </div>

      {col.missing > 0 && (
        <div style={{ color: C.faint, fontSize: 11.5, marginTop: 4 }}>{col.missing} brakujących</div>
      )}

      {/* numeric */}
      {col.type === "number" && stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", margin: "14px 0",
            fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5 }}>
            <Metric k="śr." v={fmt(stats.mean)} /><Metric k="mediana" v={fmt(stats.median)} />
            <Metric k="min" v={fmt(stats.min)} /><Metric k="max" v={fmt(stats.max)} />
            <Metric k="odch. std" v={fmt(stats.std)} /><Metric k="n" v={fmt(stats.n)} />
          </div>
          <MiniChart data={stats.bins} color={C.accent} />
        </>
      )}

      {/* category / boolean */}
      {(col.type === "category" || col.type === "boolean") && stats && (
        <>
          <div style={{ color: C.muted, fontSize: 12, margin: "10px 0 8px",
            fontFamily: "'JetBrains Mono',monospace" }}>{stats.unique} unikalnych wartości</div>
          <MiniChart data={stats.top} color={C.accent2} horizontal />
        </>
      )}

      {/* date */}
      {col.type === "date" && stats && (
        <>
          <div style={{ color: C.muted, fontSize: 12, margin: "10px 0 8px", fontFamily: "'JetBrains Mono',monospace" }}>
            {stats.min} → {stats.max}
          </div>
          <MiniChart data={stats.series} color={C.accent3} />
        </>
      )}

      {/* text */}
      {col.type === "text" && (
        <div style={{ color: C.faint, fontSize: 13, marginTop: 12, fontStyle: "italic" }}>
          Pole tekstowe — {new Set(col.values.map(String)).size} unikalnych
        </div>
      )}
    </div>
  );
}

function Metric({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
      <span style={{ color: C.faint }}>{k}</span>
      <span style={{ color: C.text }}>{v}</span>
    </div>
  );
}

function MiniChart({ data, color, horizontal }) {
  return (
    <div style={{ height: horizontal ? Math.max(90, data.length * 22) : 110, marginTop: 6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 8, left: horizontal ? 4 : -22, bottom: 0 }}>
          {horizontal ? (
            <>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={84} tick={{ fill: C.muted, fontSize: 10.5 }}
                axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tick={{ fill: C.faint, fontSize: 9 }} axisLine={{ stroke: C.border }}
                tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: C.faint, fontSize: 9 }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip cursor={{ fill: "rgba(255,255,255,.04)" }}
            contentStyle={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 8,
              fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: C.text }}
            labelStyle={{ color: C.muted }} />
          <Bar dataKey="count" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={color} fillOpacity={horizontal ? 0.85 - (i * 0.06) : 0.9} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PreviewTable({ rows, columns }) {
  const preview = rows.slice(0, 8);
  return (
    <>
      <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, color: C.muted,
        textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, margin: "0 0 14px" }}>
        Podgląd danych
      </h2>
      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13,
          fontFamily: "'JetBrains Mono',monospace" }}>
          <thead>
            <tr>{columns.map((c) => (
              <th key={c.key} style={{ textAlign: "left", padding: "10px 14px", color: C.muted,
                borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontWeight: 600 }}>{c.key}</th>
            ))}</tr>
          </thead>
          <tbody>
            {preview.map((r, i) => (
              <tr key={i}>{columns.map((c) => (
                <td key={c.key} style={{ padding: "9px 14px", borderBottom: `1px solid ${C.border}40`,
                  color: r[c.key] === null || r[c.key] === undefined || r[c.key] === "" ? C.faint : C.text,
                  whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r[c.key] === null || r[c.key] === undefined || r[c.key] === "" ? "—" : String(r[c.key])}
                </td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 8 && (
        <div style={{ color: C.faint, fontSize: 12.5, marginTop: 10, textAlign: "center" }}>
          Pokazano 8 z {fmt(rows.length)} wierszy
        </div>
      )}
    </>
  );
}
