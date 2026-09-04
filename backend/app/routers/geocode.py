from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query, Request

from app.geocode import autocomplete, reverse_geocode
from app.routers.chat import limiter
from app.schemas import AddressSuggestion

router = APIRouter()


@router.get("/geocode/autocomplete", response_model=list[AddressSuggestion])
@limiter.limit("30/minute")
def geocode_autocomplete(request: Request, q: str = Query(..., min_length=1)):
    return autocomplete(q)


@router.get("/geocode/reverse", response_model=Optional[AddressSuggestion])
@limiter.limit("30/minute")
def geocode_reverse(request: Request, lat: float = Query(...), lng: float = Query(...)):
    return reverse_geocode(lat, lng)
