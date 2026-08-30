"""Idempotent ingestion of the Master List xlsx into SQLite.

Safe to re-run: upserts by id (column '#'), preserves any lat/lng/geocode_status
already stored for unchanged rows so re-ingestion never re-triggers geocoding.
"""

from __future__ import annotations

import sys
from pathlib import Path

import openpyxl

from app.db import DATA_DIR, get_connection, init_db

DEFAULT_XLSX = DATA_DIR / "Asia_Eateries_Master_List.xlsx"
SHEET_NAME = "Master List"

# xlsx column order -> restaurants column name
COLUMNS = [
    "id", "source", "country", "state_city", "category", "cuisine", "name",
    "area", "address", "phone", "hours", "accolades", "price_guide",
    "instagram_web", "signature", "rating", "notes",
]


def _clean(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def load_rows(xlsx_path: Path):
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb[SHEET_NAME]
    rows = ws.iter_rows(values_only=True)
    next(rows)  # header
    for raw in rows:
        if raw is None or raw[0] is None:
            continue
        record = dict(zip(COLUMNS, raw[: len(COLUMNS)]))
        record = {k: _clean(v) for k, v in record.items()}
        if record["id"] is None:
            continue
        record["id"] = int(record["id"])
        if record["rating"] is not None:
            try:
                record["rating"] = float(record["rating"])
            except (TypeError, ValueError):
                record["rating"] = None
        yield record


def ingest(xlsx_path: Path = DEFAULT_XLSX) -> int:
    init_db()
    conn = get_connection()
    count = 0
    try:
        for record in load_rows(xlsx_path):
            conn.execute(
                f"""
                INSERT INTO restaurants ({', '.join(COLUMNS)})
                VALUES ({', '.join('?' for _ in COLUMNS)})
                ON CONFLICT(id) DO UPDATE SET
                    {', '.join(f'{c}=excluded.{c}' for c in COLUMNS if c != 'id')}
                """,
                [record[c] for c in COLUMNS],
            )
            count += 1
        conn.commit()
    finally:
        conn.close()
    return count


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    n = ingest(path)
    print(f"Ingested {n} rows from {path}")
