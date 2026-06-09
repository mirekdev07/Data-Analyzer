import { C, radius, space, fontStack } from "../styles/tokens.js";

function cellText(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return String(v);
    if (Number.isInteger(v)) return v.toLocaleString("en-US");
    return v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  return String(v);
}

export function PreviewTable({ columns, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ color: C.faint, fontSize: 13, padding: space.md }}>
        No preview rows.
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto", maxHeight: 480 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontFamily: fontStack.mono,
            fontSize: 12,
            color: C.text,
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              background: C.elevated,
              zIndex: 1,
            }}
          >
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderBottom: `1px solid ${C.border}`,
                    fontFamily: fontStack.mono,
                    fontSize: 10,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: C.muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={{
                  background: i % 2 ? C.surface : "transparent",
                }}
              >
                {row.map((v, j) => (
                  <td
                    key={j}
                    style={{
                      padding: "8px 14px",
                      borderBottom: `1px solid ${C.border}`,
                      whiteSpace: "nowrap",
                      color: v === null || v === undefined ? C.faint : C.text,
                    }}
                  >
                    {cellText(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
