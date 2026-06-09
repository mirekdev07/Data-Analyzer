"""Column type inference: numeric / category / date."""

from __future__ import annotations

import re
from typing import Literal

import pandas as pd

ColumnType = Literal["numeric", "category", "date"]

DATE_PATTERN = re.compile(
    r"^\d{4}[-./]\d{1,2}[-./]\d{1,2}([ T]\d|$)|^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}"
)

NUMERIC_RATIO = 0.8
DATE_RATIO = 0.6


def detect_type(series: pd.Series) -> ColumnType:
    non_null = series.dropna()
    if non_null.empty:
        return "category"

    n = len(non_null)

    numeric_coerced = pd.to_numeric(non_null, errors="coerce")
    numeric_share = numeric_coerced.notna().mean()
    if numeric_share >= NUMERIC_RATIO:
        return "numeric"

    as_text = non_null.astype(str)
    regex_share = as_text.str.match(DATE_PATTERN).mean()
    parsed_dates = pd.to_datetime(as_text, errors="coerce", utc=False)
    parsed_share = parsed_dates.notna().mean()
    if parsed_share < DATE_RATIO:
        parsed_dayfirst = pd.to_datetime(as_text, errors="coerce", dayfirst=True, utc=False)
        parsed_share = max(parsed_share, parsed_dayfirst.notna().mean())
    if regex_share >= DATE_RATIO or parsed_share >= DATE_RATIO:
        return "date"

    return "category"
