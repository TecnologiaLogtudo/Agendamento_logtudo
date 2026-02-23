from typing import List

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from ..auth import verify_admin
from ..database import async_session
from ..models import Uf, Category, CapacityProfile, Company, CapacityProfileCompany
from ..schemas import (
    UfCreate, UfResponse,
    CategoryCreate, CategoryResponse,
    CapacityProfileCreate, CapacityProfileResponse,
    CompanyResponse
)

router = APIRouter()

# --- UFs ---
@router.get("/admin/ufs", response_model=List[UfResponse])
async def list_ufs(authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        result = await session.execute(select(Uf))
        return result.scalars().all()

@router.post("/admin/ufs", response_model=UfResponse)
async def create_uf(uf: UfCreate, authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        new = Uf(name=uf.name)
        session.add(new)
        try:
            await session.commit()
            return new
        except IntegrityError:
            await session.rollback()
            raise HTTPException(status_code=400, detail="UF já existe")

@router.delete("/admin/ufs/{uf_id}")
async def delete_uf(uf_id: int, authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        stmt = delete(Uf).where(Uf.id == uf_id)
        await session.execute(stmt)
        await session.commit()
        return {"ok": True}

# --- Categories ---
@router.get("/admin/categories", response_model=List[CategoryResponse])
async def list_categories(authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        result = await session.execute(select(Category))
        return result.scalars().all()

@router.post("/admin/categories", response_model=CategoryResponse)
async def create_category(cat: CategoryCreate, authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        new = Category(name=cat.name)
        session.add(new)
        try:
            await session.commit()
            return new
        except IntegrityError:
            await session.rollback()
            raise HTTPException(status_code=400, detail="Categoria já existe")

@router.delete("/admin/categories/{cat_id}")
async def delete_category(cat_id: int, authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        stmt = delete(Category).where(Category.id == cat_id)
        await session.execute(stmt)
        await session.commit()
        return {"ok": True}

# --- Capacity profiles ---
@router.get("/admin/profiles", response_model=List[CapacityProfileResponse])
async def list_profiles(authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        result = await session.execute(
            select(CapacityProfile).options(selectinload(CapacityProfile.companies))
        )
        profiles = result.scalars().unique().all()
        return [
            CapacityProfileResponse(
                id=p.id,
                name=p.name,
                weight=p.weight,
                spot=p.spot,
                company_ids=[c.id for c in p.companies],
            )
            for p in profiles
        ]

@router.post("/admin/profiles", response_model=CapacityProfileResponse)
async def create_profile(profile: CapacityProfileCreate, authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        new = CapacityProfile(name=profile.name, weight=profile.weight, spot=profile.spot)
        # attach companies
        if not profile.company_ids:
            raise HTTPException(status_code=400, detail="É necessário selecionar ao menos uma empresa")
        for cid in profile.company_ids:
            company = await session.get(Company, cid)
            if not company:
                raise HTTPException(status_code=404, detail=f"Empresa {cid} não encontrada")
            new.companies.append(company)
        session.add(new)
        try:
            await session.commit()
            new.company_ids = profile.company_ids
            return new
        except IntegrityError:
            await session.rollback()
            raise HTTPException(status_code=400, detail="Perfil já existe")

@router.delete("/admin/profiles/{profile_id}")
async def delete_profile(profile_id: int, authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        stmt = delete(CapacityProfile).where(CapacityProfile.id == profile_id)
        await session.execute(stmt)
        await session.commit()
        return {"ok": True}
