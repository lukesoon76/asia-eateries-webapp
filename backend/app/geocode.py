"""Geocoding via OpenStreetMap Nominatim, with a persistent SQLite cache.

Nominatim's usage policy requires <=1 req/sec and a descriptive User-Agent.
Every lookup is cached by its query string so re-running ingestion or the
`find_near` chat tool on a previously-seen place never re-hits the network.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

import httpx

from app.db import get_connection

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "asia-eateries-webapp/0.1 (local dev; contact: luke.soon@gmail.com)"
MIN_INTERVAL_SECONDS = 1.05

_last_request_at = 0.0


def _throttle() -> None:
    global _last_request_at
    elapsed = time.monotonic() - _last_request_at
    if elapsed < MIN_INTERVAL_SECONDS:
        time.sleep(MIN_INTERVAL_SECONDS - elapsed)
    _last_request_at = time.monotonic()


def _cache_get(conn, key: str):
    row = conn.execute(
        "SELECT lat, lng, confidence, status FROM geocode_cache WHERE query_key = ?",
        (key,),
    ).fetchone()
    return row


def _cache_put(conn, key: str, lat, lng, confidence: str, status: str) -> None:
    conn.execute(
        """
        INSERT INTO geocode_cache (query_key, lat, lng, confidence, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(query_key) DO UPDATE SET
            lat=excluded.lat, lng=excluded.lng, confidence=excluded.confidence,
            status=excluded.status, updated_at=excluded.updated_at
        """,
        (key, lat, lng, confidence, status, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()


def geocode_query(query: str, conn=None) -> dict:
    """Geocode a free-text query, using the cache. Returns
    {"lat": float|None, "lng": float|None, "confidence": str|None, "status": "ok"|"not_found"|"error"}.
    """
    owns_conn = conn is None
    conn = conn or get_connection()
    try:
        query = (query or "").strip()
        if not query:
            return {"lat": None, "lng": None, "confidence": None, "status": "error"}

        cached = _cache_get(conn, query)
        if cached is not None:
            return {
                "lat": cached["lat"],
                "lng": cached["lng"],
                "confidence": cached["confidence"],
                "status": cached["status"],
            }

        _throttle()
        try:
            resp = httpx.get(
                NOMINATIM_URL,
                params={"q": query, "format": "jsonv2", "limit": 1},
                headers={"User-Agent": USER_AGENT},
                timeout=10.0,
            )
            resp.raise_for_status()
            results = resp.json()
        except (httpx.HTTPError, ValueError):
            _cache_put(conn, query, None, None, None, "error")
            return {"lat": None, "lng": None, "confidence": None, "status": "error"}

        if not results:
            _cache_put(conn, query, None, None, None, "not_found")
            return {"lat": None, "lng": None, "confidence": None, "status": "not_found"}

        top = results[0]
        lat, lng = float(top["lat"]), float(top["lon"])
        confidence = top.get("type") or top.get("class")
        _cache_put(conn, query, lat, lng, confidence, "ok")
        return {"lat": lat, "lng": lng, "confidence": confidence, "status": "ok"}
    finally:
        if owns_conn:
            conn.close()


def restaurant_query_string(row) -> str:
    """Build the primary geocoder query for a restaurant row: the full Address."""
    address = (row["address"] or "").strip()
    if address and address != "-":
        return address
    return restaurant_fallback_query_string(row)


def restaurant_fallback_query_string(row) -> str:
    """Coarser query used when Address is sparse, or when the full address
    fails to geocode (e.g. unit/suite numbers Nominatim can't resolve)."""
    parts = [row["area"], row["state_city"], row["country"]]
    return ", ".join(p for p in parts if p and p != "-")
