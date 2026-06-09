import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { C, fontStack } from "../styles/tokens.js";

export function MiniChart({ data, color, horizontal = false }) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 110,
          color: C.faint,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontStack.body,
        }}
      >
        No data
      </div>
    );
  }

  const fill = color || C.accent;
  const height = horizontal ? Math.max(90, data.length * 24) : 120;
  const tickStyle = { fill: C.muted, fontFamily: fontStack.mono, fontSize: 10 };

  return (
    <div style={{ height, marginTop: 6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 4 : 0 }}
        >
          {horizontal ? (
            <>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={70}
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                tick={tickStyle}
                axisLine={{ stroke: C.border }}
                tickLine={false}
                interval={0}
                height={28}
              />
              <YAxis hide />
            </>
          )}
          <Tooltip
            cursor={{ fill: C.border, opacity: 0.4 }}
            contentStyle={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              fontFamily: fontStack.mono,
              fontSize: 12,
              color: C.text,
            }}
            labelStyle={{ color: C.muted }}
            itemStyle={{ color: C.text }}
          />
          <Bar dataKey="count" fill={fill} radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
