"""File parsing: CSV / TSV / TXT / JSON / Excel."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

POLISH_DECIMAL_RE = re.compile(r"^-?\d{1,3}(?:[  \.]\d{3})*,\d+$|^-?\d+,\d+$")

EXCEL_EXTS = {".xlsx", ".xls"}
JSON_EXTS = {".json"}
CSV_EXTS = {".csv", ".tsv", ".txt"}


def read_file(path: Path, name: str) -> pd.DataFrame:
    ext = Path(name).suffix.lower()

    if ext in EXCEL_EXTS:
        return pd.read_excel(path, engine="openpyxl")

    if ext in JSON_EXTS:
        return _read_json(path)

    if ext in CSV_EXTS:
        return _read_csv(path)

    text = path.read_text(encoding="utf-8", errors="replace").lstrip()
    if text.startswith("{") or text.startswith("["):
        return _read_json(path)
    return _read_csv(path)


def _read_json(path: Path) -> pd.DataFrame:
    text = path.read_text(encoding="utf-8")
    parsed = json.loads(text)
    rows = _normalize_json(parsed)
    if not rows:
        raise ValueError("JSON: no rows detected")
    return pd.json_normalize(rows, sep=".")


def _normalize_json(parsed) -> list:
    if isinstance(parsed, list):
        if not parsed:
            return []
        if isinstance(parsed[0], dict):
            return parsed
        return [{"value": item} for item in parsed]

    if isinstance(parsed, dict):
        for value in parsed.values():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                return value
        return [parsed]

    return [{"value": parsed}]


def _read_csv(path: Path) -> pd.DataFrame:
    last_error: Exception | None = None

    for kwargs in (
        {"sep": None, "engine": "python"},
        {"sep": ",", "engine": "python"},
        {"sep": ";", "engine": "python", "decimal": ","},
        {"sep": "\t", "engine": "python"},
    ):
        try:
            df = pd.read_csv(path, **kwargs)
            if df.shape[1] > 1 or df.shape[0] > 0:
                return _normalize_localized_numerics(df)
        except Exception as exc:
            last_error = exc

    if last_error:
        raise ValueError(f"CSV: failed to parse ({last_error})")
    raise ValueError("CSV: no rows detected")


def _normalize_localized_numerics(df: pd.DataFrame) -> pd.DataFrame:
    """Convert object columns that look like Polish/European decimals to floats.

    Triggers when a column is object-typed AND >=80% of non-null values match
    the comma-decimal pattern. Skips already-numeric columns and date-like ones.
    """
    for col in df.columns:
        if df[col].dtype != object:
            continue
        s = df[col].dropna().astype(str).str.strip()
        if s.empty:
            continue
        match_share = s.str.match(POLISH_DECIMAL_RE).mean()
        if match_share < 0.8:
            continue
        cleaned = (
            df[col].astype(str)
            .str.replace(r"[  \.]", "", regex=True)
            .str.replace(",", ".", regex=False)
        )
        converted = pd.to_numeric(cleaned, errors="coerce")
        if converted.notna().mean() >= 0.8:
            df[col] = converted
    return df
