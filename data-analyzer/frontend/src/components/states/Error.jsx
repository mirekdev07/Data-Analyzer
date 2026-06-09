import { C, radius, space, fontStack } from "../../styles/tokens.js";

export function ErrorBanner({ message, onRetry }) {
  return (
    <div
      className="da-rise"
      style={{
        background: C.surface,
        border: `1px solid ${C.danger}`,
        borderRadius: radius.lg,
        padding: space.md,
        display: "flex",
        alignItems: "center",
        gap: space.md,
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: fontStack.mono,
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: C.danger,
          }}
        >
          Upload failed
        </div>
        <div
          style={{
            fontFamily: fontStack.body,
            fontSize: 14,
            color: C.text,
            marginTop: 2,
          }}
        >
          {message}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            color: C.bg,
            background: C.accent,
            borderRadius: radius.pill,
            padding: `${space.xs}px ${space.md}px`,
            fontWeight: 700,
          }}
        >
          Try another file
        </button>
      )}
    </div>
  );
}
