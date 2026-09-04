from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.geocode import autocomplete
from app.routers.chat import limiter
from app.schemas import AddressSuggestion

router = APIRouter()


@router.get("/geocode/autocomplete", response_model=list[AddressSuggestion])
@limiter.limit("30/minute")
def geocode_autocomplete(request: Request, q: str = Query(..., min_length=1)):
    return autocomplete(q)
