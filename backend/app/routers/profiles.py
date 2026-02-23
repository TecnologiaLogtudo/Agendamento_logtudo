from fastapi import APIRouter

from ..constants import PROFILE_WEIGHTS

router = APIRouter()


@router.get("/profiles")
async def get_profiles():
    return [{"name": name, "weight_kg": weight} for name, weight in PROFILE_WEIGHTS.items()]
