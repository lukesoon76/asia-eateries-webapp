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


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None
    is_admin: bool = False


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class SubmissionIn(BaseModel):
    name: str
    country: str
    state_city: str
    category: str
    cuisine: str
    area: str
    address: str
    phone: Optional[str] = None
    hours: Optional[str] = None
    price_guide: Optional[str] = None
    instagram_web: Optional[str] = None
    signature: Optional[str] = None
    notes: Optional[str] = None


class SubmissionOut(SubmissionIn):
    id: int
    status: str
    submitted_by: int
    reject_reason: Optional[str] = None
    promoted_restaurant_id: Optional[int] = None
    created_at: str
    # Loosened back to optional for output: submissions created before cuisine/area/
    # address became mandatory may still have nulls here.
    cuisine: Optional[str] = None
    area: Optional[str] = None
    address: Optional[str] = None


class AddressSuggestion(BaseModel):
    display_name: str
    lat: float
    lng: float
    country: Optional[str] = None
    state: Optional[str] = None
    area: Optional[str] = None


class RejectRequest(BaseModel):
    reason: Optional[str] = None


class DishOut(BaseModel):
    id: int
    restaurant_id: int
    name: str
    avg_rating: Optional[float] = None
    rating_count: int = 0
    my_rating: Optional[int] = None


class NewDishRequest(BaseModel):
    name: str


class RateDishRequest(BaseModel):
    rating: int


class PhotoOut(BaseModel):
    id: int
    restaurant_id: Optional[int] = None
    dish_id: Optional[int] = None
    caption: Optional[str] = None
    url: str
