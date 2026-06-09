import { C, radius, space, fontStack } from "../../styles/tokens.js";

export function Loading({ label = "Analysing your file…" }) {
  return (
    <div
      className="da-rise"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space.md,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: space.sm,
          color: C.muted,
          fontFamily: fontStack.mono,
          fontSize: 12,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        <span
          className="da-spin"
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `2px solid ${C.border}`,
            borderTopColor: C.accent,
            display: "inline-block",
          }}
        />
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gap: space.md,
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="da-skel"
            style={{
              height: 240,
              borderRadius: radius.lg,
              animationDelay: `${i * 90}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
