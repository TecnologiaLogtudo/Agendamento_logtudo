from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import create_access_token, verify_password, get_user_by_username, ADMIN_PASSWORD, COLLAB_PASSWORD
from ..schemas import LoginRequest
from ..database import get_session

router = APIRouter()


@router.post("/auth/login")
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)):
    """
    Autentica usuário contra a tabela users ou usa senhas de ambiente (compatibilidade).
    """
    # Tentar autenticar contra a tabela users
    user = await get_user_by_username(payload.username, session)
    
    if user and verify_password(payload.password, user.password):
        token = create_access_token({"role": user.role})
        return {"access_token": token, "token_type": "bearer", "role": user.role}
    
    # Fallback: compatibilidade com senhas antigas de ambiente
    if ADMIN_PASSWORD and payload.password == ADMIN_PASSWORD:
        token = create_access_token({"role": "admin"})
        return {"access_token": token, "token_type": "bearer", "role": "admin"}
    
    if COLLAB_PASSWORD and payload.password == COLLAB_PASSWORD:
        token = create_access_token({"role": "collab"})
        return {"access_token": token, "token_type": "bearer", "role": "collab"}
    
    raise HTTPException(status_code=401, detail="Usuário ou senha inválida")
