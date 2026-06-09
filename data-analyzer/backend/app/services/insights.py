"""Auto-insights about a parsed dataset.

Produces a list of observations the user should see: data-quality flags,
distribution shapes, time ranges, correlations, and group rankings.
Works across domains (finance, movies, sensors, fitness, etc.) because
it picks the most interesting numeric column(s) by signal strength
rather than relying purely on column-name keywords.
"""

from __future__ import annotations

import re

import numpy as np
import pandas as pd

MONEY_PATTERN = re.compile(
    r"price|revenue|profit|cost|sales|amount|value|gain|loss|spend|income|total|salary|fee|tax|margin|earnings|sum|"
    r"budget|box[_\- ]?office|gross|net|musd|usd|eur|pln|"
    r"kwota|kwote|cena|koszt|przychod|przychód|zysk|strata|wydatek|wydatki|wartosc|wartość|"
    r"wynagrodzenie|prowizja|sprzedaz|sprzedaż|zarobek|honorarium|rachunek|oplata|opłata|saldo|budżet",
    re.IGNORECASE,
)

ID_PATTERN = re.compile(
    r"^(id|uuid|guid|key|index|idx|nr|numer|reading_id|record_id)$|_id$|_no$|_nr$",
    re.IGNORECASE,
)

ACCUMULATIVE_HINT = re.compile(
    r"count|total|sum|sales|steps|distance|calories|score|votes|views|hits|clicks|amount|"
    r"kwota|wydatek|przychod|sprzedaz|budget|revenue|profit|cost|musd|usd|eur|pln",
    re.IGNORECASE,
)


def _fmt(v: float) -> str:
    if v is None or not np.isfinite(v):
        return "—"
    abs_v = abs(v)
    if abs_v >= 1_000_000_000:
        return f"{v / 1_000_000_000:.1f}B"
    if abs_v >= 1_000_000:
        return f"{v / 1_000_000:.1f}M"
    if abs_v >= 1_000:
        return f"{v / 1_000:.1f}K"
    if abs_v >= 100:
        return f"{v:,.1f}"
    if abs_v >= 1:
        return f"{v:,.2f}"
    if abs_v == 0:
        return "0"
    return f"{v:.3g}"


def _item(kind: str, title: str, detail: str) -> dict:
    return {"kind": kind, "title": title, "detail": detail}


def build_insights(df: pd.DataFrame, column_types: dict[str, str]) -> dict:
    rows = int(df.shape[0])
    cols = int(df.shape[1])

    if rows == 0:
        return {
            "headline": "Empty dataset",
            "items": [_item("warning", "No rows", "The file parsed successfully but contains no rows.")],
        }

    type_counts = {"numeric": 0, "category": 0, "date": 0}
    for t in column_types.values():
        if t in type_counts:
            type_counts[t] += 1
    type_parts = [f"{n} {t}" for t, n in type_counts.items() if n]
    headline = f"{rows:,} rows × {cols} columns — {', '.join(type_parts)}."

    id_cols = _detect_id_columns(df, column_types)
    metrics = [
        c for c, t in column_types.items()
        if t == "numeric" and c not in id_cols
    ]
    groups = [
        c for c, t in column_types.items()
        if t == "category" and c not in id_cols
        and 2 <= int(df[c].nunique(dropna=True)) <= 25
    ]
    label_col = _pick_label_column(df, column_types, id_cols)
    dates = [c for c, t in column_types.items() if t == "date"]

    items: list[dict] = []

    _quality_items(df, items, rows, id_cols)
    _binary_items(df, metrics, items)
    _date_span_items(df, dates, items)
    _per_metric_items(df, metrics, groups, dates, label_col, items)
    _correlation_items(df, metrics, items)
    _imbalance_items(df, groups, rows, items)

    if not items:
        items.append(_item(
            "info",
            "Clean dataset",
            "No quality flags, skew, or strong group separation worth surfacing.",
        ))

    return {"headline": headline, "items": items[:12]}


def _detect_id_columns(df, column_types) -> set[str]:
    ids: set[str] = set()
    rows = int(df.shape[0])
    for col, t in column_types.items():
        s = df[col]
        non_null = int(s.notna().sum())
        if non_null < 5:
            continue
        if ID_PATTERN.search(str(col)):
            ids.add(col)
            continue
        if t == "category" and int(s.nunique(dropna=True)) == non_null and non_null == rows:
            ids.add(col)
            continue
        if t == "numeric":
            nums = pd.to_numeric(s, errors="coerce").dropna()
            if nums.size < 5:
                continue
            uniq = int(nums.nunique())
            if uniq == nums.size and float(nums.min()) >= 0 and (nums == nums.sort_values().reset_index(drop=True)).all():
                ids.add(col)
                continue
            if uniq == nums.size and (nums.max() - nums.min()) == nums.size - 1:
                ids.add(col)
    return ids


def _pick_label_column(df, column_types, id_cols) -> str | None:
    candidates = []
    rows = int(df.shape[0])
    for col, t in column_types.items():
        if t != "category":
            continue
        s = df[col].dropna().astype(str)
        if s.empty:
            continue
        uniq = int(s.nunique())
        if uniq != s.size:
            continue
        avg_len = float(s.str.len().mean())
        if avg_len > 60:
            continue
        score = 0
        if col in id_cols:
            score += 2
        if re.search(r"name|title|tytul|tytuł|nazwa|product|symbol", str(col), re.IGNORECASE):
            score += 3
        if uniq == rows:
            score += 1
        candidates.append((score, col))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][1]


def _quality_items(df, items, rows, id_cols):
    missing_pct = (df.isna().sum() / rows * 100).round(1)
    high_missing = sorted(
        [(str(n), float(p)) for n, p in missing_pct.items() if p >= 10],
        key=lambda x: -x[1],
    )
    for name, pct in high_missing[:3]:
        items.append(_item(
            "warning",
            f"{pct:.0f}% missing in `{name}`",
            "Review or impute before drawing conclusions from this column.",
        ))

    for col in df.columns:
        s = df[col]
        non_null = int(s.notna().sum())
        if non_null == 0:
            items.append(_item(
                "warning",
                f"`{col}` is empty",
                "All values are missing — column adds no signal.",
            ))
            continue
        if int(s.nunique(dropna=True)) <= 1:
            items.append(_item(
                "info",
                f"`{col}` is constant",
                f"Only one unique value across {non_null:,} records — safe to drop.",
            ))

    for col in id_cols:
        items.append(_item(
            "info",
            f"`{col}` is an identifier",
            f"All values unique or sequential — used to label rows, excluded from numeric analysis.",
        ))


def _binary_items(df, metrics, items):
    for col in metrics:
        nums = pd.to_numeric(df[col], errors="coerce").dropna()
        if nums.size < 5:
            continue
        uniq = set(int(v) if float(v).is_integer() else float(v) for v in nums.unique())
        if not uniq.issubset({0, 1, 0.0, 1.0}):
            continue
        success_rate = float((nums == 1).mean() * 100)
        fail_rate = 100 - success_rate
        if 1 <= fail_rate <= 99:
            kind = "warning" if fail_rate >= 10 else "highlight"
            items.append(_item(
                kind,
                f"`{col}` success rate: {success_rate:.0f}%",
                f"{fail_rate:.0f}% of {int(nums.size):,} records are 0 — likely failures, false flags, or off-states.",
            ))


def _date_span_items(df, dates, items):
    for col in dates:
        parsed = pd.to_datetime(df[col], errors="coerce")
        if parsed.dropna().empty:
            parsed = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
        parsed = parsed.dropna()
        if parsed.empty:
            continue
        span_days = int((parsed.max() - parsed.min()).days)
        if span_days < 60:
            span = f"{span_days} days"
        elif span_days < 730:
            span = f"~{max(1, span_days // 30)} months"
        else:
            span = f"~{span_days // 365} years"
        items.append(_item(
            "info",
            f"`{col}` spans {span}",
            f"From {parsed.min().date().isoformat()} to {parsed.max().date().isoformat()}.",
        ))


def _per_metric_items(df, metrics, groups, dates, label_col, items):
    scored = []
    for c in metrics:
        nums = pd.to_numeric(df[c], errors="coerce").dropna()
        if nums.size < 5:
            continue
        if int(nums.nunique()) <= 2:
            continue
        cv = float(nums.std() / abs(nums.mean())) if nums.mean() != 0 else float(nums.std())
        rng = float(nums.max() - nums.min())
        scored.append((c, nums, cv, rng))

    if not scored:
        return

    scored.sort(key=lambda x: -x[2])
    chosen = scored[:3]

    for col, nums, _, _ in chosen:
        mean = float(nums.mean())
        median = float(nums.median())
        accumulative = ACCUMULATIVE_HINT.search(col) is not None or MONEY_PATTERN.search(col) is not None

        if accumulative:
            items.append(_item(
                "highlight",
                f"Total `{col}`: {_fmt(float(nums.sum()))}",
                f"Across {int(nums.size):,} records — average {_fmt(mean)}, median {_fmt(median)}.",
            ))
        else:
            items.append(_item(
                "highlight",
                f"`{col}` averages {_fmt(mean)}",
                f"Range {_fmt(float(nums.min()))} → {_fmt(float(nums.max()))} across {int(nums.size):,} records.",
            ))

        if label_col and label_col in df.columns:
            idx = nums.idxmax()
            if idx in df.index:
                label = str(df.loc[idx, label_col])
                items.append(_item(
                    "insight",
                    f"Highest `{col}`: `{label}`",
                    f"{_fmt(float(nums.loc[idx]))} — top record by `{col}`.",
                ))

        best_group = _best_grouping(df, col, groups)
        if best_group:
            group_col = best_group["col"]
            sums = best_group["sum"]
            means = best_group["mean"]
            if accumulative:
                top_group = str(sums.index[0])
                top_val = float(sums.iloc[0])
                total = float(sums.sum())
                if total > 0:
                    share = top_val / total * 100
                    items.append(_item(
                        "highlight",
                        f"Top `{group_col}` by `{col}`: `{top_group}`",
                        f"{share:.0f}% of total `{col}` ({_fmt(top_val)} out of {_fmt(total)}).",
                    ))
                    if sums.size >= 3:
                        top3 = sums.head(3)
                        top3_share = float(top3.sum()) / total * 100
                        top3_labels = ", ".join(f"`{g}`" for g in top3.index)
                        items.append(_item(
                            "insight",
                            f"Top 3 `{group_col}` drive {top3_share:.0f}% of `{col}`",
                            f"{top3_labels} — out of {int(sums.size)} groups.",
                        ))
            else:
                top_group = str(means.index[0])
                top_mean = float(means.iloc[0])
                bottom_group = str(means.index[-1])
                bottom_mean = float(means.iloc[-1])
                overall = float(nums.mean())
                ratio = top_mean / overall if overall else None
                if ratio and ratio >= 1.05:
                    items.append(_item(
                        "insight",
                        f"`{col}` is highest for `{group_col}` = `{top_group}`",
                        f"{_fmt(top_mean)} vs overall avg {_fmt(overall)} ({ratio:.2f}× higher); "
                        f"lowest is `{bottom_group}` at {_fmt(bottom_mean)}.",
                    ))

        for date_col in dates[:1]:
            parsed = pd.to_datetime(df[date_col], errors="coerce")
            if parsed.dropna().empty:
                parsed = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True)
            tmp = pd.DataFrame({"d": parsed, "v": pd.to_numeric(df[col], errors="coerce")}).dropna()
            if tmp.empty:
                continue
            buckets = tmp.groupby(tmp["d"].dt.to_period("M"))["v"]
            agg_fn = buckets.sum() if accumulative else buckets.mean()
            agg_fn = agg_fn.dropna()
            if agg_fn.size < 2:
                continue
            peak = agg_fn.idxmax()
            peak_val = float(agg_fn.max())
            avg_month = float(agg_fn.mean())
            if avg_month == 0:
                continue
            ratio = peak_val / avg_month
            if ratio >= 1.15:
                label = "Total" if accumulative else "Avg"
                items.append(_item(
                    "insight",
                    f"`{col}` peaked in {peak}",
                    f"{label} {_fmt(peak_val)} that month — {ratio:.1f}× the monthly {label.lower()}.",
                ))
            break


def _best_grouping(df, metric_col, groups):
    nums = pd.to_numeric(df[metric_col], errors="coerce")
    if nums.notna().sum() < 5:
        return None
    overall_var = float(nums.var())
    if not overall_var or not np.isfinite(overall_var):
        return None

    best = None
    best_eta = -1.0
    for g in groups:
        sub = pd.DataFrame({"g": df[g], "v": nums}).dropna()
        if sub.empty:
            continue
        agg = sub.groupby("g")["v"].agg(["mean", "count", "sum"])
        if agg.shape[0] < 2:
            continue
        grand_mean = float(sub["v"].mean())
        between = float(((agg["mean"] - grand_mean) ** 2 * agg["count"]).sum()) / max(int(sub.shape[0]) - 1, 1)
        eta = between / overall_var if overall_var > 0 else 0
        if eta > best_eta:
            best_eta = eta
            best = {
                "col": g,
                "sum": agg["sum"].sort_values(ascending=False),
                "mean": agg["mean"].sort_values(ascending=False),
                "count": agg["count"],
                "eta": eta,
            }
    return best


def _correlation_items(df, metrics, items):
    numeric = {}
    for c in metrics:
        s = pd.to_numeric(df[c], errors="coerce")
        if s.notna().sum() >= 5 and float(s.std()) > 0:
            numeric[c] = s

    if len(numeric) < 2:
        return

    nf = pd.DataFrame(numeric)
    corr = nf.corr(numeric_only=True)
    pairs = []
    cols = corr.columns.tolist()
    for i, a in enumerate(cols):
        for b in cols[i + 1:]:
            v = corr.loc[a, b]
            if pd.notna(v):
                pairs.append((a, b, float(v)))
    if not pairs:
        return

    pairs.sort(key=lambda x: -abs(x[2]))
    a, b, r = pairs[0]
    if abs(r) >= 0.6:
        direction = "move together" if r > 0 else "move inversely"
        items.append(_item(
            "insight",
            f"`{a}` and `{b}` {direction}",
            f"Pearson correlation r = {r:+.2f} — {'strong' if abs(r) >= 0.8 else 'moderate'} relationship.",
        ))


def _imbalance_items(df, groups, rows, items):
    for col in groups:
        counts = df[col].value_counts()
        if counts.empty or counts.size < 2:
            continue
        top_label = str(counts.index[0])
        top_share = float(counts.iloc[0] / counts.sum() * 100)
        if top_share >= 60:
            items.append(_item(
                "highlight",
                f"`{col}` dominated by `{top_label}`",
                f"{top_share:.0f}% of records — distribution is heavily skewed.",
            ))
