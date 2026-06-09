"""POST /api/upload — accept a file, parse, store, return summary + columns."""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..config import settings
from ..services import parser, stats, types
from ..services.store import store

router = APIRouter()

ALLOWED_EXTS = {".csv", ".tsv", ".txt", ".json", ".xlsx", ".xls"}


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    name = file.filename or "upload"
    ext = Path(name).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file extension '{ext}'. "
                   f"Allowed: {', '.join(sorted(ALLOWED_EXTS))}",
        )

    folder = settings.upload_dir / uuid.uuid4().hex
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / name

    bytes_written = 0
    try:
        with target.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > settings.max_upload_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds limit of "
                               f"{settings.max_upload_bytes // (1024 * 1024)} MB",
                    )
                out.write(chunk)

        try:
            df = parser.read_file(target, name)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to parse file: {exc}",
            ) from exc

        column_types = {col: types.detect_type(df[col]) for col in df.columns}
        columns_meta = [
            {
                "name": str(col),
                "type": column_types[col],
                "missing_count": int(df[col].isna().sum()),
            }
            for col in df.columns
        ]
        summary = stats.dataset_summary(df, name, bytes_written)
        meta = {
            "summary": summary,
            "columns": columns_meta,
            "column_types": column_types,
        }

        dataset_id = store.put(df=df, meta=meta, file_path=target)
        return {
            "dataset_id": dataset_id,
            "summary": summary,
            "columns": columns_meta,
        }

    except HTTPException:
        shutil.rmtree(folder, ignore_errors=True)
        raise
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise
    finally:
        await file.close()
