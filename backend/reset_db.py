import asyncio
import os
import sys

# Adiciona o diretório atual ao path para importar do main.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import engine, Base, async_session, Company

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