import asyncio
import os
import sys
import bcrypt
from sqlalchemy import select
from app.database import async_session
from app.models import User

def hash_password(password: str) -> str:
    """Gera o hash da senha usando bcrypt, compatível com auth.py."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

async def create_user(username, password, role):
    print(f"Conectando ao banco de dados...")
    async with async_session() as session:
        # Verifica se usuário já existe
        result = await session.execute(select(User).where(User.username == username))
        existing_user = result.scalars().first()
        
        if existing_user:
            print(f"Erro: O usuário '{username}' já existe no banco de dados.")
            return

        print(f"Criando usuário '{username}' com permissão '{role}'...")
        
        # Cria novo usuário
        hashed_pwd = hash_password(password)
        new_user = User(
            username=username,
            password=hashed_pwd,
            role=role
        )
        
        session.add(new_user)
        try:
            await session.commit()
            print(f"Sucesso! Usuário '{username}' criado.")
        except Exception as e:
            await session.rollback()
            print(f"Erro ao salvar no banco: {e}")

if __name__ == "__main__":
    # Correção para Event Loop no Windows
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    if len(sys.argv) < 3:
        print("Uso: python create_user.py <username> <password> [role]")
        print("Exemplo: python create_user.py admin MinhaSenhaForte admin")
        sys.exit(1)
    
    u_name = sys.argv[1]
    u_pass = sys.argv[2]
    # Se a role não for passada, assume 'admin'
    u_role = sys.argv[3] if len(sys.argv) > 3 else "admin"
    
    asyncio.run(create_user(u_name, u_pass, u_role))