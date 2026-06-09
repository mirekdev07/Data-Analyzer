"""JSON-safe coercion for preview rows."""

from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any

import pandas as pd


def cell(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.isoformat()
    if isinstance(value, (int, str, bool)):
        return value
    if isinstance(value, float):
        return value
    return str(value)


def preview_payload(df: pd.DataFrame, n: int) -> dict:
    head = df.head(n)
    columns = [str(c) for c in head.columns]
    rows = [[cell(v) for v in row] for row in head.itertuples(index=False, name=None)]
    return {"columns": columns, "rows": rows}
