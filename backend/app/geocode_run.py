"""Resumable batch geocoding pass over every restaurant row.

Run: uv run python -m app.geocode_run
Safe to interrupt (Ctrl-C) and restart -- processes rows with
geocode_status='pending' in id order, committing after every row.
"""

from __future__ import annotations

import sys

from app.db import get_connection
from app.geocode import geocode_query, restaurant_fallback_query_string, restaurant_query_string


def run(limit: int | None = None) -> None:
    conn = get_connection()
    try:
        query = "SELECT * FROM restaurants WHERE geocode_status = 'pending' ORDER BY id"
        if limit:
            query += f" LIMIT {int(limit)}"
        rows = conn.execute(query).fetchall()
        total = len(rows)
        print(f"Geocoding {total} pending rows...", flush=True)
        for i, row in enumerate(rows, start=1):
            q = restaurant_query_string(row)
            if not q:
                conn.execute(
                    "UPDATE restaurants SET geocode_status = 'skipped' WHERE id = ?",
                    (row["id"],),
                )
                conn.commit()
                continue
            result = geocode_query(q, conn=conn)
            if result["status"] != "ok":
                fallback_q = restaurant_fallback_query_string(row)
                if fallback_q and fallback_q != q:
                    result = geocode_query(fallback_q, conn=conn)
            conn.execute(
                """
                UPDATE restaurants
                SET lat = ?, lng = ?, geocode_confidence = ?, geocode_status = ?
                WHERE id = ?
                """,
                (result["lat"], result["lng"], result["confidence"], result["status"], row["id"]),
            )
            conn.commit()
            if i % 25 == 0 or i == total:
                print(f"  {i}/{total} done (last: id={row['id']} status={result['status']})", flush=True)
    finally:
        conn.close()
    print("Geocoding pass complete.", flush=True)


if __name__ == "__main__":
    lim = int(sys.argv[1]) if len(sys.argv) > 1 else None
    run(limit=lim)
