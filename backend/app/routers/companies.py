from typing import List
from fastapi import APIRouter, HTTPException
from sqlalchemy import select, distinct

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


@router.get("/companies/ufs", response_model=List[str])
async def get_company_ufs():
    try:
        async with async_session() as session:
            result = await session.execute(select(distinct(Company.uf)))
            return result.scalars().all()
    except Exception as e:
        print(f"Erro ao buscar UFs: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar UFs. Verifique a conexão com o banco.")
