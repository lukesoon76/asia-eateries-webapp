"""Verification contributions: users help verify unverified restaurant entries."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.auth import require_user
from app.db import get_connection
from app.queries import get_restaurant
from app.routers.photos import _save_photo

router = APIRouter(prefix="/api/restaurants", tags=["verifications"])


@router.post("/{restaurant_id}/verify/comment")
async def add_verification_comment(
    restaurant_id: int,
    comment_text: str = Form(...),
    current_user: dict = Depends(require_user),
) -> dict:
    """Add a verification comment to an unverified restaurant entry."""
    conn = get_connection()
    try:
        # Verify restaurant exists and is unverified
        restaurant = get_restaurant(restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        if restaurant["rating"] is not None:
            raise HTTPException(status_code=400, detail="Restaurant is already verified")

        comment_text = (comment_text or "").strip()
        if not comment_text or len(comment_text) > 1000:
            raise HTTPException(status_code=400, detail="Comment must be 1-1000 characters")

        # Insert verification contribution
        conn.execute(
            """
            INSERT INTO verification_contributions
            (restaurant_id, user_id, contribution_type, comment_text, created_at)
            VALUES (?, ?, 'comment', ?, ?)
            """,
            (restaurant_id, current_user["id"], comment_text, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()

        return {"status": "ok", "message": "Comment added"}
    finally:
        conn.close()


@router.post("/{restaurant_id}/verify/photo")
async def add_verification_photo(
    restaurant_id: int,
    file: Annotated[UploadFile, File(...)],
    caption: str = Form(default=""),
    current_user: dict = Depends(require_user),
) -> dict:
    """Upload a photo to help verify an unverified restaurant entry."""
    conn = get_connection()
    try:
        # Verify restaurant exists and is unverified
        restaurant = get_restaurant(restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        if restaurant["rating"] is not None:
            raise HTTPException(status_code=400, detail="Restaurant is already verified")

        # Save photo
        filename = await _save_photo(file, max_size_mb=10, max_width=1600)

        # Insert photo record
        result = conn.execute(
            """
            INSERT INTO photos (restaurant_id, uploaded_by, filename, caption, created_at)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id
            """,
            (restaurant_id, current_user["id"], filename, caption.strip()[:500], datetime.now(timezone.utc).isoformat()),
        )
        photo_id = result.fetchone()[0]

        # Insert verification contribution
        conn.execute(
            """
            INSERT INTO verification_contributions
            (restaurant_id, user_id, contribution_type, photo_id, created_at)
            VALUES (?, ?, 'photo', ?, ?)
            """,
            (restaurant_id, current_user["id"], photo_id, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()

        return {
            "status": "ok",
            "message": "Photo added",
            "photo_id": photo_id,
            "filename": filename,
        }
    finally:
        conn.close()


@router.post("/{restaurant_id}/rate")
async def rate_unverified_restaurant(
    restaurant_id: int,
    rating: float = Form(...),
    current_user: dict = Depends(require_user),
) -> dict:
    """Rate an unverified restaurant (1-10), automatically verifying it."""
    conn = get_connection()
    try:
        # Verify restaurant exists and is unverified
        restaurant = get_restaurant(restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")
        if restaurant["rating"] is not None:
            raise HTTPException(status_code=400, detail="Restaurant is already verified")

        # Validate rating
        try:
            rating = float(rating)
            if not (1.0 <= rating <= 10.0):
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 10")

        # Update restaurant with rating
        conn.execute(
            "UPDATE restaurants SET rating = ? WHERE id = ?",
            (rating, restaurant_id),
        )

        # Record the rating contribution
        conn.execute(
            """
            INSERT INTO verification_contributions
            (restaurant_id, user_id, contribution_type, comment_text, created_at)
            VALUES (?, ?, 'rating', ?, ?)
            """,
            (
                restaurant_id,
                current_user["id"],
                f"Rated {rating}/10",
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()

        return {
            "status": "ok",
            "message": f"Restaurant verified with rating {rating}/10",
            "rating": rating,
        }
    finally:
        conn.close()


@router.get("/{restaurant_id}/verifications")
async def get_verifications(restaurant_id: int) -> dict:
    """Fetch verification contributions for a restaurant."""
    conn = get_connection()
    try:
        # Verify restaurant exists
        if not get_restaurant(restaurant_id):
            raise HTTPException(status_code=404, detail="Restaurant not found")

        # Fetch contributions
        contributions = conn.execute(
            """
            SELECT
                vc.id, vc.contribution_type, vc.comment_text, vc.photo_id,
                u.display_name, vc.created_at
            FROM verification_contributions vc
            JOIN users u ON vc.user_id = u.id
            WHERE vc.restaurant_id = ?
            ORDER BY vc.created_at DESC
            """,
            (restaurant_id,),
        ).fetchall()

        result = []
        for row in contributions:
            item = {
                "id": row["id"],
                "type": row["contribution_type"],
                "contributor": row["display_name"],
                "created_at": row["created_at"],
            }
            if row["contribution_type"] == "comment":
                item["comment"] = row["comment_text"]
            elif row["contribution_type"] == "photo":
                item["photo_id"] = row["photo_id"]
            elif row["contribution_type"] == "rating":
                item["comment"] = row["comment_text"]
            result.append(item)

        return {
            "restaurant_id": restaurant_id,
            "contributions": result,
            "total_comments": sum(1 for c in result if c["type"] == "comment"),
            "total_photos": sum(1 for c in result if c["type"] == "photo"),
            "total_ratings": sum(1 for c in result if c["type"] == "rating"),
        }
    finally:
        conn.close()
