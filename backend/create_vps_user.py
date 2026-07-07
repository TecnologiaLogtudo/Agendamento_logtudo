import asyncio
import os
import sys
from pathlib import Path

# Ensure the backend package is importable when running from the repo root or VPS
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select

from app.auth import hash_password
from app.database import async_session
from app.models import User


def print_usage() -> None:
    print("Uso: python backend/create_vps_user.py [username] [password] [role]")
    print("Exemplo: python backend/create_vps_user.py tecnologia@logtudo.com.br Log@26 admin")


async def create_user(username: str, password: str, role: str) -> bool:
    print(f"Conectando ao banco de dados...")
    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == username))
        existing_user = result.scalars().first()

        if existing_user:
            print(f"Usuário '{username}' já existe. Nenhuma alteração foi feita.")
            return False

        print(f"Criando usuário '{username}' com papel '{role}'...")
        new_user = User(
            username=username,
            password=hash_password(password),
            role=role,
        )
        session.add(new_user)
        try:
            await session.commit()
            print(f"Sucesso! Usuário '{username}' criado.")
            return True
        except Exception as exc:  # pragma: no cover - defensive path
            await session.rollback()
            print(f"Erro ao salvar no banco: {exc}")
            return False


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in {"-h", "--help"}:
        print_usage()
        sys.exit(0)

    default_username = os.getenv("NEW_USER_USERNAME", "tecnologia@logtudo.com.br")
    default_password = os.getenv("NEW_USER_PASSWORD", "Log@26")
    default_role = os.getenv("NEW_USER_ROLE", "admin")

    username = sys.argv[1] if len(sys.argv) > 1 else default_username
    password = sys.argv[2] if len(sys.argv) > 2 else default_password
    role = sys.argv[3] if len(sys.argv) > 3 else default_role

    if not username or not password:
        print_usage()
        sys.exit(1)

    asyncio.run(create_user(username, password, role))
