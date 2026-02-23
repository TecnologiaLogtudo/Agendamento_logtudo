import asyncio
import os

from app.database import engine, Base, async_session
from app.models import Company

async def reset_database():
    print("Recriando banco de dados (Drop & Create)...")
    
    try:
        async with engine.begin() as conn:
            # Remove todas as tabelas e recria (reseta IDs e Schema)
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        
        print("Tabelas recriadas. Inserindo dados iniciais...")
        
        async with async_session() as session:
            companies = [
                Company(name="3 Corações"),
                Company(name="Itambé"),
                Company(name="DPA"),
            ]
            session.add_all(companies)
            await session.commit()
            print("Concluído! Banco de dados resetado com sucesso.")
            
    except Exception as e:
        print(f"Erro ao resetar banco de dados: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(reset_database())