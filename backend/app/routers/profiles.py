from typing import List

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..database import async_session
from ..models import CapacityProfile, Company

router = APIRouter()


@router.get("/profiles")
async def get_profiles(company_id: int | None = None):
    """Return vehicle capacity profiles.

    If `company_id` is provided the result is limited to profiles that are
    associated with that company (via the `capacity_profile_companies`
    join table).  This keeps the frontend forms from showing profiles that
    are irrelevant to the selected company.
    """
    try:
        async with async_session() as session:
            if company_id:
                # when a company is specified we return profiles that either
                # are explicitly linked to that company **or** have no
                # associations at all (global profiles).
                # using the relationship avoids writing manual joins.
                stmt = (
                    select(CapacityProfile)
                    .where(
                        (~CapacityProfile.companies.any()) |
                        (CapacityProfile.companies.any(Company.id == company_id))
                    )
                )
            else:
                stmt = select(CapacityProfile)

            result = await session.execute(stmt)
            profiles = result.scalars().unique().all()
            return [
                {"name": p.name, "weight_kg": p.weight, "spot": p.spot}
                for p in profiles
            ]
    except Exception as e:
        print(f"Erro ao buscar perfis: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar perfis")
