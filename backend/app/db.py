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
"""


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
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Initialized schema at {DB_PATH}")
