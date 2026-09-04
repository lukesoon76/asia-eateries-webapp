"""Password hashing, session tokens, and auth dependencies.

Sessions are server-side (a row per login) rather than JWTs, so a logout or
a revoke is just a DELETE -- no signing-key rotation story to manage.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Cookie, HTTPException

from app.db import get_connection

SESSION_COOKIE_NAME = "session"
SESSION_TTL_DAYS = 30


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_session(user_id: int) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=SESSION_TTL_DAYS)
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now.isoformat(), expires_at.isoformat()),
        )
        conn.commit()
    finally:
        conn.close()
    return token, expires_at


def delete_session(token: str) -> None:
    conn = get_connection()
    try:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
    finally:
        conn.close()


def _user_for_token(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    conn = get_connection()
    try:
        row = conn.execute(
            """
            SELECT u.id, u.email, u.display_name, u.is_admin
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > ?
            """,
            (token, datetime.now(timezone.utc).isoformat()),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_current_user(session: Optional[str] = Cookie(default=None)) -> Optional[dict]:
    return _user_for_token(session)


def require_user(session: Optional[str] = Cookie(default=None)) -> dict:
    user = _user_for_token(session)
    if user is None:
        raise HTTPException(status_code=401, detail="Login required")
    return user


def require_admin(session: Optional[str] = Cookie(default=None)) -> dict:
    user = require_user(session)
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    return user
