import { C, fontStack, space } from "../../styles/tokens.js";

export function Empty() {
  return (
    <div
      style={{
        textAlign: "center",
        color: C.muted,
        fontFamily: fontStack.body,
        fontSize: 14,
        padding: `${space.xl}px ${space.md}px`,
        maxWidth: 540,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          fontFamily: fontStack.display,
          fontSize: 16,
          color: C.text,
          marginBottom: space.sm,
          fontWeight: 700,
        }}
      >
        Three things happen after you drop a file
      </div>
      <ol
        style={{
          textAlign: "left",
          paddingLeft: space.lg,
          lineHeight: 1.7,
        }}
      >
        <li>The file is uploaded to the server and parsed with pandas.</li>
        <li>Each column gets a type (numeric, category or date) automatically.</li>
        <li>You get statistics, distributions and a preview — no data leaves your session.</li>
      </ol>
    </div>
  );
}
