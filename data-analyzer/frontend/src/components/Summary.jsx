import { useEffect, useState } from "react";
import { api } from "../api.js";
import { C, radius, space, fontStack } from "../styles/tokens.js";

const KIND = {
  warning:   { dot: C.danger,  label: "Watch out" },
  highlight: { dot: C.accent,  label: "Highlight" },
  insight:   { dot: C.accent3, label: "Insight" },
  info:      { dot: C.muted,   label: "Info" },
};

function renderText(text) {
  const parts = String(text).split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`") ? (
      <code
        key={i}
        style={{
          fontFamily: fontStack.mono,
          fontSize: "0.92em",
          color: C.accent,
          background: C.elevated,
          padding: "1px 6px",
          borderRadius: 4,
        }}
      >
        {p.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function Item({ item }) {
  const k = KIND[item.kind] || KIND.info;
  return (
    <div
      className="da-rise"
      style={{
        display: "flex",
        gap: space.md,
        padding: `${space.md}px 0`,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ flexShrink: 0, paddingTop: 6 }}>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: k.dot,
          }}
        />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: fontStack.mono,
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: C.muted,
            marginBottom: 2,
          }}
        >
          {k.label}
        </div>
        <div
          style={{
            fontFamily: fontStack.display,
            fontWeight: 700,
            fontSize: 16,
            color: C.text,
            lineHeight: 1.3,
          }}
        >
          {renderText(item.title)}
        </div>
        <div
          style={{
            fontFamily: fontStack.body,
            fontSize: 14,
            color: C.muted,
            marginTop: 4,
            lineHeight: 1.45,
          }}
        >
          {renderText(item.detail)}
        </div>
      </div>
    </div>
  );
}

export function Summary({ datasetId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    api
      .insights(datasetId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [datasetId]);

  if (loading) {
    return (
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: radius.lg,
          padding: space.lg,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="da-skel"
            style={{
              height: 60,
              marginBottom: i < 2 ? 8 : 0,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.danger}`,
          borderRadius: radius.lg,
          padding: space.md,
          color: C.danger,
          fontFamily: fontStack.body,
          fontSize: 14,
        }}
      >
        Summary unavailable: {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        padding: `${space.lg}px ${space.lg}px ${space.sm}px`,
      }}
    >
      <div
        style={{
          fontFamily: fontStack.body,
          fontSize: 14,
          color: C.muted,
          marginBottom: space.sm,
        }}
      >
        {renderText(data.headline)}
      </div>
      <div>
        {data.items.map((it, i) => (
          <Item key={i} item={it} />
        ))}
      </div>
    </div>
  );
}
