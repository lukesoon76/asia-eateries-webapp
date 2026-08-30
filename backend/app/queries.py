"""Shared search/filter SQL used by both the /api/search endpoint and the
chat tools, so the two never drift apart.
"""

from __future__ import annotations

import math
import sqlite3
from typing import Optional

from app.db import get_connection

COLUMNS = [
    "id", "source", "country", "state_city", "category", "cuisine", "name",
    "area", "address", "phone", "hours", "accolades", "price_guide",
    "instagram_web", "signature", "rating", "notes", "lat", "lng", "geocode_status",
]

SORTABLE = {"rating": "rating", "name": "name", "id": "id"}


def row_to_dict(row: sqlite3.Row) -> dict:
    d = {c: row[c] for c in COLUMNS}
    d["verified"] = d["rating"] is not None
    return d


def search_restaurants(
    *,
    q: Optional[str] = None,
    country: Optional[list[str]] = None,
    state_city: Optional[list[str]] = None,
    category: Optional[list[str]] = None,
    cuisine: Optional[list[str]] = None,
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None,
    has_accolade: Optional[bool] = None,
    verified_only: Optional[bool] = None,
    price_contains: Optional[str] = None,
    area_contains: Optional[str] = None,
    name_contains: Optional[str] = None,
    address_contains: Optional[str] = None,
    notes_contains: Optional[str] = None,
    source_contains: Optional[str] = None,
    phone_contains: Optional[str] = None,
    hours_contains: Optional[str] = None,
    instagram_contains: Optional[str] = None,
    signature_contains: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "id",
    order: str = "asc",
) -> tuple[int, list[dict]]:
    conn = get_connection()
    try:
        where = []
        params: list = []

        base_table = "restaurants r"
        if q and q.strip():
            base_table = (
                "restaurants r JOIN restaurants_fts f ON f.rowid = r.id"
            )
            where.append("restaurants_fts MATCH ?")
            params.append(_fts_query(q))

        def in_clause(col: str, values: Optional[list[str]]):
            if values:
                placeholders = ", ".join("?" for _ in values)
                where.append(f"r.{col} IN ({placeholders})")
                params.extend(values)

        in_clause("country", country)
        in_clause("state_city", state_city)
        in_clause("category", category)
        in_clause("cuisine", cuisine)

        if min_rating is not None:
            where.append("r.rating >= ?")
            params.append(min_rating)
        if max_rating is not None:
            where.append("r.rating <= ?")
            params.append(max_rating)
        if has_accolade:
            where.append("r.accolades IS NOT NULL AND r.accolades != '-' AND r.accolades != ''")
        if verified_only:
            where.append("r.rating IS NOT NULL")

        def contains_clause(col: str, value: Optional[str]):
            if value and value.strip():
                where.append(f"r.{col} LIKE ?")
                params.append(f"%{value.strip()}%")

        contains_clause("price_guide", price_contains)
        contains_clause("area", area_contains)
        contains_clause("name", name_contains)
        contains_clause("address", address_contains)
        contains_clause("notes", notes_contains)
        contains_clause("source", source_contains)
        contains_clause("phone", phone_contains)
        contains_clause("hours", hours_contains)
        contains_clause("instagram_web", instagram_contains)
        contains_clause("signature", signature_contains)

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""

        total = conn.execute(
            f"SELECT COUNT(*) FROM {base_table} {where_sql}", params
        ).fetchone()[0]

        sort_col = SORTABLE.get(sort_by, "id")
        order_sql = "DESC" if order == "desc" else "ASC"
        # NULLs last regardless of direction, so unrated rows don't dominate rating sort.
        order_by = f"r.{sort_col} IS NULL, r.{sort_col} {order_sql}"

        page = max(page, 1)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size

        rows = conn.execute(
            f"""
            SELECT r.* FROM {base_table}
            {where_sql}
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
            """,
            [*params, page_size, offset],
        ).fetchall()

        return total, [row_to_dict(r) for r in rows]
    finally:
        conn.close()


def _fts_query(q: str) -> str:
    """Turn free text into an FTS5 prefix query so partial words still match."""
    tokens = [t.replace('"', '') for t in q.strip().split() if t.strip()]
    if not tokens:
        return q
    return " ".join(f'{t}*' for t in tokens)


def get_restaurant(restaurant_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM restaurants WHERE id = ?", (restaurant_id,)
        ).fetchone()
        return row_to_dict(row) if row else None
    finally:
        conn.close()


def find_near(
    lat: float,
    lng: float,
    radius_km: float = 3.0,
    category: Optional[str] = None,
    cuisine: Optional[str] = None,
    min_rating: Optional[float] = None,
    limit: int = 10,
) -> list[dict]:
    """Haversine-distance search over geocoded rows within radius_km, closest first."""
    conn = get_connection()
    try:
        where = ["r.lat IS NOT NULL", "r.lng IS NOT NULL"]
        params: list = []
        if category:
            where.append("r.category LIKE ?")
            params.append(f"%{category}%")
        if cuisine:
            where.append("r.cuisine LIKE ?")
            params.append(f"%{cuisine}%")
        if min_rating is not None:
            where.append("r.rating >= ?")
            params.append(min_rating)

        rows = conn.execute(
            f"SELECT * FROM restaurants r WHERE {' AND '.join(where)}", params
        ).fetchall()

        results = []
        for row in rows:
            d = row_to_dict(row)
            dist = _haversine_km(lat, lng, row["lat"], row["lng"])
            if dist <= radius_km:
                d["distance_km"] = round(dist, 2)
                results.append(d)
        results.sort(key=lambda r: r["distance_km"])
        return results[:limit]
    finally:
        conn.close()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def get_filter_options() -> dict:
    conn = get_connection()
    try:
        def distinct(col: str) -> list[str]:
            rows = conn.execute(
                f"SELECT DISTINCT {col} FROM restaurants WHERE {col} IS NOT NULL AND {col} != '' ORDER BY {col}"
            ).fetchall()
            return [r[0] for r in rows]

        return {
            "country": distinct("country"),
            "state_city": distinct("state_city"),
            "category": distinct("category"),
            "cuisine": distinct("cuisine"),
        }
    finally:
        conn.close()
