from datetime import datetime, timedelta, timezone
import os
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_session
from .models import User

SECRET_KEY = os.getenv("SECRET_KEY", "sua_chave_secreta_padrao_desenvolvimento")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24))
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")  # Senha Mestra (compatibilidade)
COLLAB_PASSWORD = os.getenv("COLLAB_PASSWORD")  # Senha do colaborador (compatibilidade)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash bcrypt."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


async def get_user_by_username(username: str, session: AsyncSession) -> User | None:
    """Busca um usuário pelo username no banco de dados."""
    result = await session.execute(select(User).where(User.username == username))
    return result.scalars().first()


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def verify_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acesso negado: Requer privilégios de administrador",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role")
        if role != "admin":
            # Retorna 403 se o token for válido mas não for admin
            raise forbidden_exception
    except JWTError:
        raise credentials_exception
    return True


async def verify_collaborator(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role")
        if role not in ("admin", "collab"):
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return True
