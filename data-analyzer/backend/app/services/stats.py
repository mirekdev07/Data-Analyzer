"""Per-column statistics, ported from prototype DataAnalyzer.jsx (L48-L101)."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd


def numeric_stats(series: pd.Series) -> dict:
    nums = pd.to_numeric(series, errors="coerce").dropna()
    n = int(nums.size)
    if n == 0:
        return {
            "n": 0, "mean": None, "median": None, "std": None,
            "min": None, "max": None, "bins": [],
        }

    arr = nums.to_numpy(dtype=float)
    bin_count = max(5, min(12, round(math.sqrt(n))))
    counts, edges = np.histogram(arr, bins=bin_count)
    bins = [
        {"x0": float(edges[i]), "x1": float(edges[i + 1]), "count": int(counts[i])}
        for i in range(len(counts))
    ]
    return {
        "n": n,
        "mean": float(nums.mean()),
        "median": float(nums.median()),
        "std": float(nums.std(ddof=1)) if n > 1 else 0.0,
        "min": float(nums.min()),
        "max": float(nums.max()),
        "bins": bins,
    }


def category_stats(series: pd.Series) -> dict:
    non_null = series.dropna().astype(str)
    counts = non_null.value_counts()
    return {
        "n": int(non_null.size),
        "unique": int(counts.size),
        "missing": int(series.isna().sum()),
        "top": [
            {"label": str(label), "count": int(count)}
            for label, count in counts.head(8).items()
        ],
    }


def date_stats(series: pd.Series) -> dict:
    dates = pd.to_datetime(series, errors="coerce").dropna()
    if dates.empty:
        dates = pd.to_datetime(series, errors="coerce", dayfirst=True).dropna()
    if dates.empty:
        return {"n": 0, "min": None, "max": None, "series": []}
    buckets = dates.dt.to_period("M").value_counts().sort_index()
    return {
        "n": int(dates.size),
        "min": dates.min().isoformat(),
        "max": dates.max().isoformat(),
        "series": [
            {"label": str(period), "count": int(count)}
            for period, count in buckets.items()
        ],
    }


def dataset_summary(df: pd.DataFrame, file_name: str, size_bytes: int) -> dict:
    total = int(df.size)
    missing = int(df.isna().sum().sum())
    return {
        "file_name": file_name,
        "size_bytes": size_bytes,
        "rows": int(df.shape[0]),
        "cols": int(df.shape[1]),
        "missing_pct": (missing / total * 100) if total else 0.0,
    }
