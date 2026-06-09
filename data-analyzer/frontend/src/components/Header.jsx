import { C, radius, space, fontStack } from "../styles/tokens.js";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function Pill({ label, value, accent }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: `${space.xs}px ${space.md}px`,
        background: C.elevated,
        border: `1px solid ${C.border}`,
        borderRadius: radius.md,
      }}
    >
      <span
        style={{
          fontFamily: fontStack.mono,
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: fontStack.display,
          fontWeight: 700,
          fontSize: 18,
          color: accent || C.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function Header({ summary, onReset }) {
  if (!summary) return null;
  return (
    <div
      className="da-rise"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: space.md,
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${space.md}px ${space.lg}px`,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: fontStack.mono,
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          Dataset
        </div>
        <div
          style={{
            fontFamily: fontStack.display,
            fontWeight: 700,
            fontSize: 24,
            color: C.text,
            overflowWrap: "anywhere",
          }}
        >
          {summary.file_name}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
        <Pill label="Rows" value={summary.rows.toLocaleString("en-US")} accent={C.accent} />
        <Pill label="Columns" value={summary.cols} accent={C.accent3} />
        <Pill
          label="Missing"
          value={`${summary.missing_pct.toFixed(1)}%`}
          accent={summary.missing_pct > 5 ? C.warning : C.text}
        />
        <Pill label="Size" value={formatBytes(summary.size_bytes)} />
        <button
          onClick={onReset}
          style={{
            background: C.elevated,
            border: `1px solid ${C.border}`,
            borderRadius: radius.md,
            padding: `${space.sm}px ${space.md}px`,
            color: C.text,
            fontFamily: fontStack.body,
            fontWeight: 600,
            fontSize: 14,
            transition: "border-color .15s, color .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = C.danger;
            e.currentTarget.style.color = C.danger;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.text;
          }}
        >
          New file
        </button>
      </div>
    </div>
  );
}
