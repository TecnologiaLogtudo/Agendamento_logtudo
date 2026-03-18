from fastapi import APIRouter

from ..constants import CATEGORIES

router = APIRouter()


@router.get("/categories")
async def get_categories():
    return CATEGORIES
