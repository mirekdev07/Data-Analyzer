"""In-memory dataset store with TTL eviction."""

from __future__ import annotations

import shutil
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd


@dataclass
class Entry:
    df: pd.DataFrame
    meta: dict
    file_path: Path
    created_at: float = field(default_factory=time.time)


class DatasetStore:
    def __init__(self) -> None:
        self._items: dict[str, Entry] = {}
        self._lock = threading.Lock()

    def put(self, df: pd.DataFrame, meta: dict, file_path: Path) -> str:
        dataset_id = uuid.uuid4().hex
        with self._lock:
            self._items[dataset_id] = Entry(df=df, meta=meta, file_path=file_path)
        return dataset_id

    def get(self, dataset_id: str) -> Entry | None:
        with self._lock:
            return self._items.get(dataset_id)

    def evict_older_than(self, ttl_seconds: int) -> int:
        now = time.time()
        removed = 0
        with self._lock:
            expired_ids = [
                k for k, v in self._items.items()
                if now - v.created_at > ttl_seconds
            ]
            for k in expired_ids:
                entry = self._items.pop(k)
                shutil.rmtree(entry.file_path.parent, ignore_errors=True)
                removed += 1
        return removed


store = DatasetStore()
