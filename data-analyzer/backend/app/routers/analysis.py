"""GET endpoints for dataset summary, columns, per-column stats, and preview."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..config import settings
from ..services import stats
from ..services.insights import build_insights
from ..services.preview import preview_payload
from ..services.store import store

router = APIRouter()


def _require_entry(dataset_id: str):
    entry = store.get(dataset_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Dataset not found or expired")
    return entry


@router.get("/datasets/{dataset_id}/summary")
def get_summary(dataset_id: str):
    entry = _require_entry(dataset_id)
    return entry.meta["summary"]


@router.get("/datasets/{dataset_id}/columns")
def get_columns(dataset_id: str):
    entry = _require_entry(dataset_id)
    return entry.meta["columns"]


@router.get("/datasets/{dataset_id}/columns/{name}")
def get_column_stats(dataset_id: str, name: str):
    entry = _require_entry(dataset_id)
    if name not in entry.df.columns:
        raise HTTPException(status_code=404, detail=f"Column '{name}' not found")

    series = entry.df[name]
    col_type = entry.meta["column_types"][name]
    missing = int(series.isna().sum())

    if col_type == "numeric":
        detail = stats.numeric_stats(series)
    elif col_type == "date":
        detail = stats.date_stats(series)
    else:
        detail = stats.category_stats(series)

    return {
        "name": name,
        "type": col_type,
        "missing_count": missing,
        "detail": detail,
    }


@router.get("/datasets/{dataset_id}/insights")
def get_insights(dataset_id: str):
    entry = _require_entry(dataset_id)
    cache = entry.meta.get("insights")
    if cache is None:
        cache = build_insights(entry.df, entry.meta["column_types"])
        entry.meta["insights"] = cache
    return cache


@router.get("/datasets/{dataset_id}/preview")
def get_preview(
    dataset_id: str,
    n: int = Query(default=None, ge=1, le=500),
):
    entry = _require_entry(dataset_id)
    rows = n or settings.preview_default_rows
    return preview_payload(entry.df, rows)
