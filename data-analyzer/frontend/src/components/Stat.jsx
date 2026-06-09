import { C, radius, space, fontStack } from "../styles/tokens.js";

export function Stat({ label, value, accent }) {
  return (
    <div
      style={{
        background: C.elevated,
        border: `1px solid ${C.border}`,
        borderRadius: radius.md,
        padding: `10px 14px`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: fontStack.mono,
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: C.faint,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fontStack.mono,
          fontSize: 18,
          fontWeight: 600,
          color: accent || C.text,
          marginTop: 4,
          letterSpacing: -0.3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={String(value)}
      >
        {value}
      </div>
    </div>
  );
}
