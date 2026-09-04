from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user, require_user
from app.db import get_connection
from app.schemas import DishOut, NewDishRequest, RateDishRequest

router = APIRouter()


def _dish_out(conn, dish_row, user_id: Optional[int]) -> DishOut:
    agg = conn.execute(
        "SELECT AVG(rating) as avg_rating, COUNT(*) as n FROM dish_ratings WHERE dish_id = ?",
        (dish_row["id"],),
    ).fetchone()
    my_rating = None
    if user_id:
        mine = conn.execute(
            "SELECT rating FROM dish_ratings WHERE dish_id = ? AND user_id = ?", (dish_row["id"], user_id)
        ).fetchone()
        my_rating = mine["rating"] if mine else None
    return DishOut(
        id=dish_row["id"],
        restaurant_id=dish_row["restaurant_id"],
        name=dish_row["name"],
        avg_rating=round(agg["avg_rating"], 1) if agg["avg_rating"] is not None else None,
        rating_count=agg["n"],
        my_rating=my_rating,
    )


@router.get("/restaurants/{restaurant_id}/dishes", response_model=list[DishOut])
def list_dishes(restaurant_id: int, user: Optional[dict] = Depends(get_current_user)):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM dishes WHERE restaurant_id = ? ORDER BY id", (restaurant_id,)
        ).fetchall()
        return [_dish_out(conn, r, user["id"] if user else None) for r in rows]
    finally:
        conn.close()


@router.post("/restaurants/{restaurant_id}/dishes", response_model=DishOut)
def add_dish(restaurant_id: int, body: NewDishRequest, user: dict = Depends(require_user)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Dish name is required")

    conn = get_connection()
    try:
        restaurant = conn.execute("SELECT id FROM restaurants WHERE id = ?", (restaurant_id,)).fetchone()
        if restaurant is None:
            raise HTTPException(status_code=404, detail="Restaurant not found")

        existing = conn.execute(
            "SELECT * FROM dishes WHERE restaurant_id = ? AND name = ? COLLATE NOCASE",
            (restaurant_id, name),
        ).fetchone()
        if existing:
            return _dish_out(conn, existing, user["id"])

        cur = conn.execute(
            "INSERT INTO dishes (restaurant_id, name, created_by, created_at) VALUES (?, ?, ?, ?)",
            (restaurant_id, name, user["id"], datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM dishes WHERE id = ?", (cur.lastrowid,)).fetchone()
        return _dish_out(conn, row, user["id"])
    finally:
        conn.close()


@router.post("/dishes/{dish_id}/rate", response_model=DishOut)
def rate_dish(dish_id: int, body: RateDishRequest, user: dict = Depends(require_user)):
    if not 1 <= body.rating <= 10:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 10")

    conn = get_connection()
    try:
        dish = conn.execute("SELECT * FROM dishes WHERE id = ?", (dish_id,)).fetchone()
        if dish is None:
            raise HTTPException(status_code=404, detail="Dish not found")

        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO dish_ratings (dish_id, user_id, rating, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(dish_id, user_id) DO UPDATE SET rating = excluded.rating, updated_at = excluded.updated_at
            """,
            (dish_id, user["id"], body.rating, now, now),
        )
        conn.commit()
        return _dish_out(conn, dish, user["id"])
    finally:
        conn.close()
