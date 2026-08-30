from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.queries import get_restaurant
from app.schemas import RestaurantOut

router = APIRouter()


@router.get("/restaurants/{restaurant_id}", response_model=RestaurantOut)
def restaurant_detail(restaurant_id: int):
    row = get_restaurant(restaurant_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return row
