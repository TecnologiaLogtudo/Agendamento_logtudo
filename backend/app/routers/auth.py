from fastapi import APIRouter, HTTPException

from ..auth import create_access_token, ADMIN_PASSWORD, COLLAB_PASSWORD
from ..schemas import LoginRequest

router = APIRouter()


@router.post("/auth/login")
async def login(payload: LoginRequest):
    if payload.password == ADMIN_PASSWORD:
        token = create_access_token({"role": "admin"})
        return {"access_token": token, "token_type": "bearer", "role": "admin"}
    if payload.password == COLLAB_PASSWORD:
        token = create_access_token({"role": "collab"})
        return {"access_token": token, "token_type": "bearer", "role": "collab"}
    raise HTTPException(status_code=401, detail="Senha inválida")
