import { useCallback, useRef, useState } from "react";
import { C, radius, space, fontStack } from "../styles/tokens.js";

const ACCEPT = ".csv,.tsv,.txt,.json,.xlsx,.xls";

export function Dropzone({ onFile, busy }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      if (busy) return;
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile, busy]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onClick={() => !busy && inputRef.current?.click()}
      style={{
        cursor: busy ? "default" : "pointer",
        background: drag ? C.elevated : C.surface,
        border: `1.5px dashed ${drag ? C.accent : C.border}`,
        borderRadius: radius.lg,
        padding: `${space.xxl}px ${space.lg}px`,
        textAlign: "center",
        transition: "border-color .15s, background .15s, transform .15s",
        transform: drag ? "scale(1.01)" : "scale(1)",
        boxShadow: drag ? `0 0 0 4px ${C.accent}22` : "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontFamily: fontStack.display,
          fontWeight: 700,
          fontSize: 28,
          color: drag ? C.accent : C.text,
          marginBottom: space.sm,
          letterSpacing: -0.5,
        }}
      >
        {busy ? "Analysing…" : drag ? "Drop to analyse" : "Drop a file to analyse"}
      </div>
      <div
        style={{
          fontFamily: fontStack.body,
          fontSize: 14,
          color: C.muted,
          marginBottom: space.lg,
        }}
      >
        or click to browse · .csv, .tsv, .txt, .json, .xlsx
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div
        style={{
          display: "inline-flex",
          gap: space.sm,
          fontFamily: fontStack.mono,
          fontSize: 11,
          color: C.faint,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        <span>max 100 MB</span>
        <span>·</span>
        <span>processed on server</span>
      </div>
    </div>
  );
}
