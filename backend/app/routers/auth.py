from __future__ import annotations

import os
import re
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from app.auth import (
    SESSION_COOKIE_NAME,
    SESSION_TTL_DAYS,
    create_session,
    delete_session,
    get_current_user,
    hash_password,
    verify_password,
)
from app.db import get_connection
from app.schemas import LoginRequest, RegisterRequest, UserOut

router = APIRouter()

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_COOKIE_SECURE = os.environ.get("ENV") == "production"


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=_COOKIE_SECURE,
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        path="/",
    )


def _to_user_out(row: sqlite3.Row) -> UserOut:
    return UserOut(
        id=row["id"], email=row["email"], display_name=row["display_name"], is_admin=bool(row["is_admin"])
    )


@router.post("/auth/register", response_model=UserOut)
def register(body: RegisterRequest, response: Response):
    email = body.email.strip().lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    conn = get_connection()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with that email already exists")

        cur = conn.execute(
            "INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)",
            (email, hash_password(body.password), body.display_name, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    finally:
        conn.close()

    token, _ = create_session(row["id"])
    _set_session_cookie(response, token)
    return _to_user_out(row)


@router.post("/auth/login", response_model=UserOut)
def login(body: LoginRequest, response: Response):
    email = body.email.strip().lower()
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    finally:
        conn.close()

    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token, _ = create_session(row["id"])
    _set_session_cookie(response, token)
    return _to_user_out(row)


@router.post("/auth/logout")
def logout(response: Response, session: Optional[str] = Cookie(default=None)):
    if session:
        delete_session(session)
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/auth/me", response_model=Optional[UserOut])
def me(user: Optional[dict] = Depends(get_current_user)):
    return UserOut(**user) if user else None
