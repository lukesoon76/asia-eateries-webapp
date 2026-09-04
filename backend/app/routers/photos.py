from __future__ import annotations

import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.auth import require_user
from app.db import DB_DIR, get_connection
from app.schemas import PhotoOut

router = APIRouter()

UPLOADS_DIR = DB_DIR / "uploads"
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8MB
MAX_DIMENSION = 1600


def _photo_out(row) -> PhotoOut:
    return PhotoOut(
        id=row["id"],
        restaurant_id=row["restaurant_id"],
        dish_id=row["dish_id"],
        caption=row["caption"],
        url=f"/uploads/{row['filename']}",
    )


@router.post("/photos", response_model=PhotoOut)
async def upload_photo(
    file: UploadFile,
    restaurant_id: Optional[int] = Form(default=None),
    submission_id: Optional[int] = Form(default=None),
    dish_id: Optional[int] = Form(default=None),
    caption: Optional[str] = Form(default=None),
    user: dict = Depends(require_user),
):
    if not restaurant_id and not submission_id:
        raise HTTPException(status_code=400, detail="restaurant_id or submission_id is required")

    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 8MB or smaller")

    try:
        image = Image.open(BytesIO(raw))
        image.verify()
        image = Image.open(BytesIO(raw))  # re-open: verify() consumes the parser
        image = image.convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="File is not a readable image")

    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION))

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    # Re-saving as JPEG (no EXIF passthrough) also strips GPS/EXIF metadata.
    image.save(UPLOADS_DIR / filename, format="JPEG", quality=85)

    conn = get_connection()
    try:
        cur = conn.execute(
            """
            INSERT INTO photos (restaurant_id, submission_id, dish_id, uploaded_by, filename, caption, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (restaurant_id, submission_id, dish_id, user["id"], filename, caption,
             datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM photos WHERE id = ?", (cur.lastrowid,)).fetchone()
    finally:
        conn.close()
    return _photo_out(row)


@router.get("/restaurants/{restaurant_id}/photos", response_model=list[PhotoOut])
def list_photos(restaurant_id: int):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM photos WHERE restaurant_id = ? ORDER BY id DESC", (restaurant_id,)
        ).fetchall()
    finally:
        conn.close()
    return [_photo_out(r) for r in rows]
