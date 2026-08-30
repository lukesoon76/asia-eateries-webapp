# Asia Eateries

A searchable web app over a 10,000+ row curated database of restaurants and food
stalls across Malaysia, Singapore, Thailand, Hong Kong, Taiwan, and other Asian
cities, with a Google-like search bar, an Advanced Filters panel covering every
column, and a tool-using AI chat feature ("what to eat near PJ Sheraton").

- **Backend:** FastAPI + SQLite (FTS5 full-text search), Python 3.12 (uv)
- **Frontend:** React + Vite + Tailwind CSS
- **Chat:** [Groq](https://console.groq.com) (free tier, OpenAI-compatible tool calling)
- **Geocoding:** OpenStreetMap Nominatim, cached in SQLite

## Local development

Run the backend and frontend as two separate dev servers (the frontend proxies
`/api/*` to the backend during development — see `frontend/vite.config.ts`).

### Backend

```bash
cd backend
uv sync
cp .env.example .env   # then fill in GROQ_API_KEY
uv run python -m app.ingest        # one-time: build the SQLite DB from the xlsx
uv run python -m app.geocode_run   # optional: geocode all rows (~2.5-3h, resumable)
uv run uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Re-ingesting updated data

Drop a new `Asia_Eateries_Master_List.xlsx` into `backend/data/`, then re-run:

```bash
cd backend
uv run python -m app.ingest
```

Ingestion **upserts by row id**, so existing rows keep their `lat`/`lng`/
`geocode_status` — re-ingestion never re-triggers geocoding for unchanged
rows. Run `uv run python -m app.geocode_run` again afterward to geocode any
newly-added rows (it only processes rows with `geocode_status = 'pending'`).

## Geocoding cache

Every geocoded query string (an address, or an area+state+country fallback)
is cached in the `geocode_cache` table, keyed by the exact query string sent
to Nominatim. Re-running `geocode_run` — after a re-ingestion, or after an
interruption — never re-hits the network for a query already in the cache.
Nominatim's usage policy caps requests at 1/second, so a full pass over
10,000 rows takes roughly 2.5-3 hours; it's safe to Ctrl-C and resume later.

## Chat / AI feature

Get a free API key from [console.groq.com](https://console.groq.com) (no
credit card required) and set `GROQ_API_KEY` in `backend/.env`. Without a
key, `/api/chat` returns a clear 503 rather than crashing; every other
feature (search, filters, detail view) works with no key at all.

## Deployment (Render)

`render.yaml` defines a single Web Service that builds the frontend, installs
the backend, and serves both the API (`/api/*`) and the built React app from
one FastAPI process.

1. Push this repo to GitHub and create a Blueprint on Render pointing at it.
2. Set the `GROQ_API_KEY` secret in the Render dashboard (marked `sync: false`
   in `render.yaml` so it isn't stored in the repo).
3. The `asia-eateries-data` persistent disk keeps `backend/data/eateries.db`
   (and the geocoding cache) across deploys. To load or refresh data on a live
   instance, upload a new xlsx via the Render dashboard's shell and re-run
   `uv run python -m app.ingest` from `backend/`.

## Non-goals (v1)

No user accounts, no write access to the data, no live data sync — data
updates happen via manual xlsx re-ingestion. English-only UI (restaurant
names/notes containing Chinese/Thai text render as-is).
