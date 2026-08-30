from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from app.queries import search_restaurants
from app.schemas import SearchResponse

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
def search(
    q: Optional[str] = Query(None, description="Free-text query against name/area/address/category/cuisine/signature/notes/source"),
    country: Optional[list[str]] = Query(None),
    state: Optional[list[str]] = Query(None, alias="state"),
    category: Optional[list[str]] = Query(None),
    cuisine: Optional[list[str]] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    max_rating: Optional[float] = Query(None, ge=0, le=5),
    has_accolade: Optional[bool] = Query(None),
    verified_only: Optional[bool] = Query(None),
    price_contains: Optional[str] = Query(None),
    area: Optional[str] = Query(None, description="Area/Location contains"),
    name: Optional[str] = Query(None, description="Name contains"),
    address: Optional[str] = Query(None, description="Address contains"),
    notes: Optional[str] = Query(None, description="Notes contains"),
    source: Optional[str] = Query(None, description="Source contains"),
    phone: Optional[str] = Query(None, description="Phone contains"),
    hours: Optional[str] = Query(None, description="Typical Hours contains"),
    instagram: Optional[str] = Query(None, description="Instagram/Web contains"),
    signature: Optional[str] = Query(None, description="What To Order/Signature contains"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    sort_by: str = Query("id", pattern="^(rating|name|id)$"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
):
    total, results = search_restaurants(
        q=q,
        country=country,
        state_city=state,
        category=category,
        cuisine=cuisine,
        min_rating=min_rating,
        max_rating=max_rating,
        has_accolade=has_accolade,
        verified_only=verified_only,
        price_contains=price_contains,
        area_contains=area,
        name_contains=name,
        address_contains=address,
        notes_contains=notes,
        source_contains=source,
        phone_contains=phone,
        hours_contains=hours,
        instagram_contains=instagram,
        signature_contains=signature,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        order=order,
    )
    return {"total": total, "page": page, "page_size": page_size, "results": results}
