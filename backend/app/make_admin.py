"""One-off CLI to promote a registered user to admin.

Usage: uv run python -m app.make_admin <email>
"""

from __future__ import annotations

import sys

from app.db import get_connection


def make_admin(email: str) -> None:
    conn = get_connection()
    try:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
        if row is None:
            print(f"No user with email {email!r}. Register that account first, then re-run this.")
            return
        conn.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (row["id"],))
        conn.commit()
        print(f"{email} is now an admin.")
    finally:
        conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: uv run python -m app.make_admin <email>")
        sys.exit(1)
    make_admin(sys.argv[1])
