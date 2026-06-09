import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ColumnCard } from "./ColumnCard.jsx";

export function ColumnGrid({ datasetId, columns }) {
  const [details, setDetails] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(() =>
    Object.fromEntries(columns.map((c) => [c.name, true]))
  );

  function loadOne(col) {
    setLoading((s) => ({ ...s, [col.name]: true }));
    setErrors((s) => ({ ...s, [col.name]: null }));
    api
      .column(datasetId, col.name)
      .then((res) =>
        setDetails((s) => ({ ...s, [col.name]: res.detail }))
      )
      .catch((err) =>
        setErrors((s) => ({ ...s, [col.name]: err.message }))
      )
      .finally(() =>
        setLoading((s) => ({ ...s, [col.name]: false }))
      );
  }

  useEffect(() => {
    setDetails({});
    setErrors({});
    setLoading(Object.fromEntries(columns.map((c) => [c.name, true])));
    columns.forEach((c) => loadOne(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
      }}
    >
      {columns.map((col, i) => (
        <ColumnCard
          key={col.name}
          meta={col}
          detail={details[col.name]}
          loading={loading[col.name]}
          error={errors[col.name]}
          onRetry={() => loadOne(col)}
          delay={i * 30}
        />
      ))}
    </div>
  );
}
