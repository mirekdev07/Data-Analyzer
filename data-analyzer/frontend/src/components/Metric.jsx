import { C, fontStack } from "../styles/tokens.js";

export function Metric({ k, v }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "6px 0",
        borderBottom: `1px solid ${C.border}`,
        fontFamily: fontStack.body,
      }}
    >
      <span style={{ color: C.muted, fontSize: 13 }}>{k}</span>
      <span
        style={{
          color: C.text,
          fontFamily: fontStack.mono,
          fontSize: 13,
          overflowWrap: "anywhere",
        }}
      >
        {v}
      </span>
    </div>
  );
}
