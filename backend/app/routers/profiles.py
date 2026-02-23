from typing import List

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..database import async_session
from ..models import CapacityProfile

router = APIRouter()


@router.get("/profiles")
async def get_profiles():
    try:
        async with async_session() as session:
            result = await session.execute(select(CapacityProfile))
            profiles = result.scalars().all()
            return [
                {"name": p.name, "weight_kg": p.weight, "spot": p.spot}
                for p in profiles
            ]
    except Exception as e:
        print(f"Erro ao buscar perfis: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar perfis")
