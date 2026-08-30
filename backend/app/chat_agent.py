"""Tool-using chat agent over the eateries DB, backed by the Groq API
(OpenAI-compatible tool calling, free tier -- see console.groq.com).

The model never invents restaurant facts: every factual claim must come from
a tool result. Determinism of the underlying data lookups is guaranteed by
`app.queries` (plain SQL); the LLM only decides which tool to call and how to
phrase the final answer.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

from groq import Groq

from app.db import get_connection
from app.geocode import geocode_query
from app.queries import find_near, get_restaurant, search_restaurants

MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

SYSTEM_PROMPT = """You are the Asia Eateries assistant: a concise, trustworthy guide to a \
curated database of restaurants and food stalls across Malaysia, Singapore, Thailand, \
Hong Kong, Taiwan, and other Asian cities.

Rules:
- ALWAYS call a tool before answering a question about specific restaurants or dishes. \
Never invent a restaurant, rating, address, or dish from memory.
- When you cite a place, pull its details (name, rating, one distinguishing fact) directly \
from the tool result.
- If a restaurant's rating is null, call it out as an "unverified entry" rather than \
stating or implying a rating.
- If the Notes field for a place mentions a hygiene warning, permanent closure, or a \
Michelin/Bib Gourmand accolade, surface that -- it matters to the user.
- Keep answers short: a one-line lead-in, then a list of `Name — rating (or "unverified") \
— one-line why`. Avoid long paragraphs.
- If a location in the user's question is a landmark or place you can't confidently place \
(and find_near returns no geocode), ask a brief clarifying question instead of guessing.
- If asked a follow-up like "what about something cheaper?", reuse context from earlier in \
the conversation.
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_restaurants",
            "description": (
                "Full-text + filtered search over the restaurant database. Use for queries "
                "like 'best char kuey teow in KL', 'hakka restaurants in Cheras', or 'cheap "
                "eats in George Town'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Free-text search, e.g. a dish or restaurant name"},
                    "category": {"type": "string", "description": "Food type category, e.g. 'Char Kuey Teow'"},
                    "cuisine": {"type": "string", "description": "Cuisine/style, e.g. 'Hakka Cuisine'"},
                    "country": {"type": "string"},
                    "state": {"type": "string", "description": "State/City, e.g. 'Kuala Lumpur', 'Penang'"},
                    "min_rating": {"type": "number"},
                    "area": {"type": "string", "description": "Neighbourhood, e.g. 'Cheras', 'George Town'"},
                    "limit": {"type": "integer", "default": 8},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_near",
            "description": (
                "Find restaurants near a named place or address, e.g. 'PJ Sheraton', by "
                "geocoding it and searching within a radius. Use for 'near X' / 'around X' "
                "questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "place_name_or_address": {"type": "string"},
                    "radius_km": {"type": "number", "default": 3},
                    "category": {"type": "string"},
                    "cuisine": {"type": "string"},
                    "min_rating": {"type": "number"},
                    "limit": {"type": "integer", "default": 8},
                },
                "required": ["place_name_or_address"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_restaurant_details",
            "description": "Look up the full record for one restaurant by id, for follow-up questions like 'tell me more about the second one'.",
            "parameters": {
                "type": "object",
                "properties": {"id": {"type": "integer"}},
                "required": ["id"],
            },
        },
    },
]


def _run_tool(name: str, tool_input: dict[str, Any]) -> tuple[dict, list[dict]]:
    """Execute a tool call. Returns (tool_result_payload, restaurants_surfaced)."""
    if name == "search_restaurants":
        total, results = search_restaurants(
            q=tool_input.get("query"),
            country=[tool_input["country"]] if tool_input.get("country") else None,
            state_city=[tool_input["state"]] if tool_input.get("state") else None,
            category=[tool_input["category"]] if tool_input.get("category") else None,
            cuisine=[tool_input["cuisine"]] if tool_input.get("cuisine") else None,
            min_rating=tool_input.get("min_rating"),
            area_contains=tool_input.get("area"),
            page=1,
            page_size=int(tool_input.get("limit") or 8),
            sort_by="rating",
            order="desc",
        )
        return {"total": total, "results": results}, results

    if name == "find_near":
        place = tool_input.get("place_name_or_address", "")
        geo = geocode_query(place)
        if geo["status"] != "ok":
            return {"error": f"Could not geocode '{place}'. Ask the user to clarify the location."}, []
        results = find_near(
            geo["lat"],
            geo["lng"],
            radius_km=float(tool_input.get("radius_km") or 3),
            category=tool_input.get("category"),
            cuisine=tool_input.get("cuisine"),
            min_rating=tool_input.get("min_rating"),
            limit=int(tool_input.get("limit") or 8),
        )
        return {"geocoded": {"lat": geo["lat"], "lng": geo["lng"]}, "results": results}, results

    if name == "get_restaurant_details":
        row = get_restaurant(int(tool_input["id"]))
        if row is None:
            return {"error": "No restaurant with that id."}, []
        return {"result": row}, [row]

    return {"error": f"Unknown tool {name}"}, []


def _load_history(conversation_id: str) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT role, content FROM conversation_messages WHERE conversation_id = ? ORDER BY id",
            (conversation_id,),
        ).fetchall()
        return [{"role": r["role"], "content": r["content"]} for r in rows]
    finally:
        conn.close()


def _ensure_conversation(conversation_id: str) -> None:
    conn = get_connection()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO conversations (conversation_id, created_at) VALUES (?, ?)",
            (conversation_id, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


def _save_message(conversation_id: str, role: str, content: str) -> None:
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO conversation_messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (conversation_id, role, content, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


class ChatAgentError(Exception):
    pass


def _default(o):
    return str(o)


def run_chat(message: str, conversation_id: str) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ChatAgentError(
            "GROQ_API_KEY is not set. Add it to backend/.env to enable the chat feature."
        )

    _ensure_conversation(conversation_id)
    history = _load_history(conversation_id)

    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend({"role": h["role"], "content": h["content"]} for h in history)
    messages.append({"role": "user", "content": message})

    client = Groq(api_key=api_key)
    surfaced: list[dict] = []
    seen_ids: set[int] = set()

    for _ in range(6):  # hard cap on tool-use round-trips per turn
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=1024,
            tools=TOOLS,
            tool_choice="auto",
            messages=messages,
        )
        choice = response.choices[0].message

        if not choice.tool_calls:
            answer = choice.content or ""
            _save_message(conversation_id, "user", message)
            _save_message(conversation_id, "assistant", answer)
            return {
                "answer": answer,
                "restaurants": surfaced[:12],
                "conversation_id": conversation_id,
            }

        messages.append(
            {
                "role": "assistant",
                "content": choice.content,
                "tool_calls": [tc.model_dump() for tc in choice.tool_calls],
            }
        )

        for tc in choice.tool_calls:
            try:
                tool_input = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_input = {}
            payload, results = _run_tool(tc.function.name, tool_input)
            for r in results:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    surfaced.append(r)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(payload, default=_default)[:8000],
                }
            )

    # Safety valve: if the model won't stop calling tools, answer with what we have.
    _save_message(conversation_id, "user", message)
    fallback = "I found some options but I'm having trouble summarizing them — here's what matched:"
    _save_message(conversation_id, "assistant", fallback)
    return {"answer": fallback, "restaurants": surfaced[:12], "conversation_id": conversation_id}
