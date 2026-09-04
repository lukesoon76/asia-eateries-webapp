"""SQLite connection + schema for the eateries datastore."""

from __future__ import annotations

import sqlite3
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
# Mutable/generated state (the SQLite DB + geocode cache) lives in a subdirectory
# so it can be mounted as a separate persistent disk without shadowing the
# git-tracked seed xlsx that also lives under DATA_DIR.
DB_DIR = DATA_DIR / "db"
DB_PATH = DB_DIR / "eateries.db"

# Column order mirrors the source xlsx (17 columns), plus geocoding fields.
SCHEMA = """
CREATE TABLE IF NOT EXISTS restaurants (
    id                  INTEGER PRIMARY KEY,
    source              TEXT,
    country             TEXT,
    state_city          TEXT,
    category            TEXT,
    cuisine             TEXT,
    name                TEXT,
    area                TEXT,
    address             TEXT,
    phone               TEXT,
    hours               TEXT,
    accolades           TEXT,
    price_guide         TEXT,
    instagram_web       TEXT,
    signature           TEXT,
    rating              REAL,
    notes               TEXT,
    lat                 REAL,
    lng                 REAL,
    geocode_status      TEXT DEFAULT 'pending',
    geocode_confidence  TEXT
);

CREATE INDEX IF NOT EXISTS idx_restaurants_country ON restaurants(country);
CREATE INDEX IF NOT EXISTS idx_restaurants_state_city ON restaurants(state_city);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants(cuisine);
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(rating);
CREATE INDEX IF NOT EXISTS idx_restaurants_geocode_status ON restaurants(geocode_status);

CREATE VIRTUAL TABLE IF NOT EXISTS restaurants_fts USING fts5(
    name, area, address, category, cuisine, signature, notes, source,
    content='restaurants', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS restaurants_ai AFTER INSERT ON restaurants BEGIN
    INSERT INTO restaurants_fts(rowid, name, area, address, category, cuisine, signature, notes, source)
    VALUES (new.id, new.name, new.area, new.address, new.category, new.cuisine, new.signature, new.notes, new.source);
END;

CREATE TRIGGER IF NOT EXISTS restaurants_ad AFTER DELETE ON restaurants BEGIN
    INSERT INTO restaurants_fts(restaurants_fts, rowid, name, area, address, category, cuisine, signature, notes, source)
    VALUES ('delete', old.id, old.name, old.area, old.address, old.category, old.cuisine, old.signature, old.notes, old.source);
END;

CREATE TRIGGER IF NOT EXISTS restaurants_au AFTER UPDATE ON restaurants BEGIN
    INSERT INTO restaurants_fts(restaurants_fts, rowid, name, area, address, category, cuisine, signature, notes, source)
    VALUES ('delete', old.id, old.name, old.area, old.address, old.category, old.cuisine, old.signature, old.notes, old.source);
    INSERT INTO restaurants_fts(rowid, name, area, address, category, cuisine, signature, notes, source)
    VALUES (new.id, new.name, new.area, new.address, new.category, new.cuisine, new.signature, new.notes, new.source);
END;

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id  TEXT PRIMARY KEY,
    created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id  TEXT NOT NULL REFERENCES conversations(conversation_id),
    role             TEXT NOT NULL,
    content          TEXT NOT NULL,
    created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geocode_cache (
    query_key   TEXT PRIMARY KEY,
    lat         REAL,
    lng         REAL,
    confidence  TEXT,
    status      TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    email          TEXT UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    display_name   TEXT,
    is_admin       INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_by            INTEGER NOT NULL REFERENCES users(id),
    status                  TEXT NOT NULL DEFAULT 'pending',
    name                    TEXT NOT NULL,
    country                 TEXT NOT NULL,
    state_city              TEXT NOT NULL,
    category                TEXT NOT NULL,
    cuisine                 TEXT,
    area                    TEXT,
    address                 TEXT,
    phone                   TEXT,
    hours                   TEXT,
    price_guide             TEXT,
    instagram_web           TEXT,
    signature               TEXT,
    notes                   TEXT,
    reviewed_by             INTEGER REFERENCES users(id),
    reviewed_at             TEXT,
    reject_reason           TEXT,
    promoted_restaurant_id  INTEGER REFERENCES restaurants(id),
    created_at              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON submissions(submitted_by);

CREATE TABLE IF NOT EXISTS dishes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id  INTEGER NOT NULL REFERENCES restaurants(id),
    name           TEXT NOT NULL,
    created_by     INTEGER REFERENCES users(id),
    created_at     TEXT NOT NULL,
    UNIQUE(restaurant_id, name COLLATE NOCASE)
);

CREATE TABLE IF NOT EXISTS dish_ratings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    dish_id     INTEGER NOT NULL REFERENCES dishes(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 10),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    UNIQUE(dish_id, user_id)
);

CREATE TABLE IF NOT EXISTS photos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id  INTEGER REFERENCES restaurants(id),
    submission_id  INTEGER REFERENCES submissions(id),
    dish_id        INTEGER REFERENCES dishes(id),
    uploaded_by    INTEGER NOT NULL REFERENCES users(id),
    filename       TEXT NOT NULL,
    caption        TEXT,
    created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_restaurant_id ON photos(restaurant_id);
"""

# Additive column migrations -- SQLite has no `ADD COLUMN IF NOT EXISTS`,
# so each is idempotent via try/except on the "duplicate column" error.
MIGRATIONS = [
    "ALTER TABLE restaurants ADD COLUMN submission_id INTEGER REFERENCES submissions(id)",
]


def get_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        conn.executescript(SCHEMA)
        for statement in MIGRATIONS:
            try:
                conn.execute(statement)
            except sqlite3.OperationalError as e:
                if "duplicate column" not in str(e):
                    raise
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Initialized schema at {DB_PATH}")
