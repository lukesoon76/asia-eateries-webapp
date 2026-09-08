"""Parse natural language chat queries to extract structured search intent.

Extracts location, cuisine, category, price tier, and rating constraints from
user messages so the chat agent can pre-filter results locally before sending
them to the LLM. This reduces token usage and steers the model toward
intentional, curated recommendations.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class ParsedQuery:
    """Extracted intent and constraints from a user message."""
    original: str
    # What the user is asking for (search, find_near, refine_past)
    intent: str  # "search" | "find_near" | "refine_past" | "unknown"
    # Filter hints (all optional, used to pre-filter locally)
    location: str | None = None  # place name or area
    cuisine: str | None = None
    category: str | None = None
    price_tier: str | None = None  # "cheap" | "moderate" | "expensive"
    min_rating: float | None = None  # e.g., 8.5 for "highly rated"
    # Whether to sort by distance (find_near) vs rating (search)
    sort_by_distance: bool = False
    # Whether to prefer verified entries only
    verified_only: bool = False


# Cuisine keywords (case-insensitive)
CUISINE_KEYWORDS = {
    "thai": "Thai Cuisine",
    "chinese": "Chinese Cuisine",
    "indian": "Indian Cuisine",
    "japanese": "Japanese Cuisine",
    "korean": "Korean Cuisine",
    "malaysian": "Malaysian Cuisine",
    "singaporean": "Singaporean Cuisine",
    "vietnamese": "Vietnamese Cuisine",
    "hakka": "Hakka Cuisine",
    "cantonese": "Cantonese Cuisine",
    "sichuan": "Sichuan Cuisine",
    "peking": "Peking Duck",
    "dim sum": "Dim Sum",
}

# Category keywords
CATEGORY_KEYWORDS = {
    "char kuey teow": "Char Kuey Teow",
    "laksa": "Laksa",
    "noodle": "Noodles",
    "ramen": "Ramen",
    "pho": "Pho",
    "rice": "Rice Dishes",
    "dumpling": "Dumplings",
    "bun": "Buns",
    "wonton": "Wonton",
    "dessert": "Desserts",
    "cake": "Cakes",
    "coffee": "Coffee",
    "cafe": "Cafes",
    "bakery": "Bakery",
    "seafood": "Seafood",
    "bbq": "BBQ",
    "barbecue": "BBQ",
    "satay": "Satay",
    "curry": "Curry",
    "tom yum": "Tom Yum",
    "pad thai": "Pad Thai",
}

# Price tier indicators
CHEAP_KEYWORDS = {"cheap", "budget", "affordable", "inexpensive", "hawker", "stall", "street food", "under rm10", "under $5"}
EXPENSIVE_KEYWORDS = {"expensive", "upscale", "fine dining", "premium", "luxury", "michelin"}
MODERATE_KEYWORDS = {"moderate", "mid-range", "casual", "comfortable"}

# Location keywords (state/city in the dataset)
LOCATION_KEYWORDS = {
    "kl": "Kuala Lumpur",
    "kuala lumpur": "Kuala Lumpur",
    "penang": "Penang",
    "sg": "Singapore",
    "singapore": "Singapore",
    "bangkok": "Bangkok",
    "phuket": "Phuket",
    "hong kong": "Hong Kong",
    "taipei": "Taipei",
    "klang": "Klang",
    "petaling jaya": "Petaling Jaya",
    "pj": "Petaling Jaya",
    "subang": "Subang",
    "shah alam": "Shah Alam",
    "selangor": "Selangor",
    "cheras": "Cheras",
}

# Rating tier indicators
RATING_KEYWORDS = {
    "best": 8.5,
    "top": 8.5,
    "highly rated": 8.0,
    "highly-rated": 8.0,
    "rated": 7.0,
    "good": 7.0,
    "great": 8.0,
}

# Intent keywords
NEAR_KEYWORDS = {"near", "around", "close to", "beside", "next to", "by the", "at the", "in front of"}
ALTERNATIVE_KEYWORDS = {"what about", "instead", "other", "else", "different", "another", "something else"}


def parse_chat_query(message: str) -> ParsedQuery:
    """Parse a user's chat message into structured query components."""
    msg_lower = message.lower().strip()
    result = ParsedQuery(original=message, intent="unknown")

    # Detect intent: refine_past (alternatives), find_near (location-based), or search
    if any(kw in msg_lower for kw in ALTERNATIVE_KEYWORDS):
        result.intent = "refine_past"
        result.sort_by_distance = False
    elif any(kw in msg_lower for kw in NEAR_KEYWORDS):
        result.intent = "find_near"
        result.sort_by_distance = True
    else:
        result.intent = "search"
        result.sort_by_distance = False

    # Extract location (look for place names)
    for keyword, standard in LOCATION_KEYWORDS.items():
        if keyword in msg_lower:
            result.location = standard
            break

    # Extract cuisine
    for keyword, standard in CUISINE_KEYWORDS.items():
        if keyword in msg_lower:
            result.cuisine = standard
            break

    # Extract category
    for keyword, standard in CATEGORY_KEYWORDS.items():
        if keyword in msg_lower:
            result.category = standard
            break

    # Extract price tier (check in order: cheap < moderate < expensive)
    if any(kw in msg_lower for kw in CHEAP_KEYWORDS):
        result.price_tier = "cheap"
    elif any(kw in msg_lower for kw in EXPENSIVE_KEYWORDS):
        result.price_tier = "expensive"
    elif any(kw in msg_lower for kw in MODERATE_KEYWORDS):
        result.price_tier = "moderate"

    # Extract rating tier
    for keyword, min_rating in RATING_KEYWORDS.items():
        if keyword in msg_lower:
            result.min_rating = min_rating
            break

    # Detect "highly verified" intent (e.g., "best rated")
    if any(kw in msg_lower for kw in ["verified", "best", "top-rated", "top rated", "rated"]):
        if result.min_rating is None:
            result.min_rating = 7.0
        result.verified_only = True

    return result


def price_tier_to_search_term(tier: str) -> str | None:
    """Map a price tier to a search term for the price_guide field."""
    if tier == "cheap":
        return "RM10"  # Budget range indicator
    if tier == "expensive":
        return "RM50"  # Higher price range
    return None
