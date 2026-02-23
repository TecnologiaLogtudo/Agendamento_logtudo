from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, distinct, delete
from sqlalchemy.exc import IntegrityError
from ..auth import verify_admin

from ..database import async_session
from ..models import Company
from ..schemas import CompanyResponse

router = APIRouter()


@router.get("/companies", response_model=List[CompanyResponse])
async def get_companies():
    try:
        async with async_session() as session:
            result = await session.execute(select(Company))
            return result.scalars().all()
    except Exception as e:
        print(f"Erro ao buscar empresas: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar empresas. Verifique a conexão com o banco.")


@router.post("/companies", response_model=CompanyResponse)
async def create_company(company: CompanyResponse, authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        new = Company(name=company.name)
        session.add(new)
        try:
            await session.commit()
            return new
        except IntegrityError:
            await session.rollback()
            raise HTTPException(status_code=400, detail="Empresa já existe")


@router.delete("/companies/{company_id}")
async def delete_company(company_id: int, authorized: bool = Depends(verify_admin)):
    async with async_session() as session:
        stmt = delete(Company).where(Company.id == company_id)
        await session.execute(stmt)
        await session.commit()
        return {"ok": True}


@router.get("/companies/ufs", response_model=List[str])
async def get_company_ufs():
    try:
        async with async_session() as session:
            result = await session.execute(select(distinct(Company.uf)))
            return result.scalars().all()
    except Exception as e:
        print(f"Erro ao buscar UFs: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar UFs. Verifique a conexão com o banco.")
