import { C, radius, space, fontStack } from "../styles/tokens.js";
import { Stat } from "./Stat.jsx";
import { Metric } from "./Metric.jsx";
import { MiniChart } from "./MiniChart.jsx";

const TYPE_META = {
  numeric: { label: "Numeric", color: C.accent },
  category: { label: "Category", color: C.accent2 },
  date: { label: "Date", color: C.accent3 },
};

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

function fmt(x) {
  if (x === null || x === undefined) return "—";
  if (typeof x !== "number" || !Number.isFinite(x)) return String(x);
  const abs = Math.abs(x);
  if (abs !== 0 && abs < 0.01) return x.toExponential(2);
  if (abs >= 10000) return COMPACT.format(x);
  if (Number.isInteger(x)) return x.toLocaleString("en-US");
  if (abs >= 100) return x.toFixed(1);
  return x.toFixed(2);
}

function shortDate(iso) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function ColumnCard({ meta, detail, loading, error, onRetry, delay = 0 }) {
  const typeMeta = TYPE_META[meta.type] || TYPE_META.category;

  return (
    <div
      className="da-rise"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        padding: space.md,
        animationDelay: `${delay}ms`,
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: space.sm, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: fontStack.display,
              fontWeight: 700,
              fontSize: 18,
              color: C.text,
              overflowWrap: "anywhere",
              lineHeight: 1.2,
            }}
          >
            {meta.name}
          </div>
          <div
            style={{
              fontFamily: fontStack.mono,
              fontSize: 10,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: C.muted,
              marginTop: 2,
            }}
          >
            {meta.missing_count} missing
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: fontStack.mono,
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: C.muted,
            border: `1px solid ${C.border}`,
            padding: "3px 8px 3px 6px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: typeMeta.color,
              display: "inline-block",
            }}
          />
          {typeMeta.label}
        </span>
      </div>

      {loading && <ColumnCardSkeleton type={meta.type} />}
      {error && (
        <div
          style={{
            color: C.danger,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            padding: "8px 0",
          }}
        >
          <span>Failed: {error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                color: C.accent,
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: "2px 10px",
                fontSize: 12,
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {!loading && !error && detail && meta.type === "numeric" && (
        <NumericBody d={detail} fmt={fmt} typeColor={typeMeta.color} />
      )}
      {!loading && !error && detail && meta.type === "category" && (
        <CategoryBody d={detail} typeColor={typeMeta.color} />
      )}
      {!loading && !error && detail && meta.type === "date" && (
        <DateBody d={detail} typeColor={typeMeta.color} />
      )}
    </div>
  );
}

function NumericBody({ d, fmt, typeColor }) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <Stat label="Mean" value={fmt(d.mean)} />
        <Stat label="Median" value={fmt(d.median)} />
        <Stat label="Min" value={fmt(d.min)} />
        <Stat label="Max" value={fmt(d.max)} />
        <Stat label="Std" value={fmt(d.std)} />
        <Stat label="N" value={fmt(d.n)} />
      </div>
      <MiniChart
        data={d.bins.map((b) => ({
          label: `${fmt(b.x0)}`,
          count: b.count,
        }))}
        color={typeColor}
      />
    </>
  );
}

function CategoryBody({ d, typeColor }) {
  return (
    <>
      <div>
        <Metric k="Values" v={d.n.toLocaleString("en-US")} />
        <Metric k="Unique" v={d.unique.toLocaleString("en-US")} />
        <Metric k="Missing" v={d.missing.toLocaleString("en-US")} />
      </div>
      <MiniChart data={d.top} color={typeColor} horizontal />
    </>
  );
}

function DateBody({ d, typeColor }) {
  return (
    <>
      <div>
        <Metric k="First" v={shortDate(d.min)} />
        <Metric k="Last" v={shortDate(d.max)} />
        <Metric k="N" v={d.n.toLocaleString("en-US")} />
      </div>
      <MiniChart data={d.series} color={typeColor} />
    </>
  );
}

function ColumnCardSkeleton({ type }) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: type === "numeric" ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {[...Array(type === "numeric" ? 6 : 3)].map((_, i) => (
          <div key={i} className="da-skel" style={{ height: 52 }} />
        ))}
      </div>
      <div className="da-skel" style={{ height: 110, marginTop: 6 }} />
    </>
  );
}
