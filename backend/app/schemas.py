from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel


class RestaurantOut(BaseModel):
    id: int
    source: Optional[str] = None
    country: Optional[str] = None
    state_city: Optional[str] = None
    category: Optional[str] = None
    cuisine: Optional[str] = None
    name: Optional[str] = None
    area: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    hours: Optional[str] = None
    accolades: Optional[str] = None
    price_guide: Optional[str] = None
    instagram_web: Optional[str] = None
    signature: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    geocode_status: Optional[str] = None
    verified: bool = False
    distance_km: Optional[float] = None


class SearchResponse(BaseModel):
    total: int
    page: int
    page_size: int
    results: list[RestaurantOut]


class FilterOptions(BaseModel):
    country: list[str]
    state_city: list[str]
    category: list[str]
    cuisine: list[str]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    restaurants: list[RestaurantOut]
    conversation_id: str
