from __future__ import annotations

from fastapi import APIRouter

from app.queries import get_filter_options
from app.schemas import FilterOptions

router = APIRouter()


@router.get("/filters/options", response_model=FilterOptions)
def filter_options():
    return get_filter_options()
