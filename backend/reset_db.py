import asyncio
import os

from app.database import engine, Base, async_session
from app.models import Company, Uf, Category, CapacityProfile


async def reset_database():
    print("Recriando banco de dados (Drop & Create)...")
    print(f"Usando DATABASE_URL={os.getenv('DATABASE_URL')}")
    
    try:
        async with engine.begin() as conn:
            # Remove todas as tabelas e recria (reseta IDs e Schema)
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        
        print("Tabelas recriadas. Inserindo dados iniciais...")
        
        async with async_session() as session:
            # Companies
            companies = [
                Company(name="3 Corações"),
                Company(name="Itambé"),
                Company(name="DPA"),
            ]
            session.add_all(companies)

            # UFs
            ufs = [
                Uf(name="BAHIA"),
                Uf(name="CEARÁ"),
                Uf(name="PERNAMBUCO"),
            ]
            session.add_all(ufs)

            # Categories
            categories = [
                Category(name="Carros em rota"),
                Category(name="Reentrega"),
                Category(name="Em viagem"),
                Category(name="Indisponíveis"),
                Category(name="Diária"),
                Category(name="Spot/Parado"),
                Category(name="Perdidas"),
            ]
            session.add_all(categories)

            # Profiles
            profiles = [
                CapacityProfile(name="HR", weight=1500),
                CapacityProfile(name="3/4", weight=3500),
                CapacityProfile(name="Toco", weight=7000),
                CapacityProfile(name="Truck", weight=14000),
            ]
            session.add_all(profiles)

            await session.commit()
            print("Concluído! Banco de dados resetado com sucesso.")
            
    except Exception as e:
        print(f"Erro ao resetar banco de dados: {e}")
        print("Verifique se a variável DATABASE_URL está correta e se o servidor está acessível.")
        print("Se você está rodando localmente e não tem Postgres, remova DATABASE_URL ou ajuste-o para um banco local.")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(reset_database())