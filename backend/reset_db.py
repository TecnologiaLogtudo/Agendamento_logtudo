import asyncio
import os
import sys

# Adiciona o diretório atual ao path para importar do main.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import async_session, Schedule, ScheduleCategory, ScheduleCapacity, LostPlate
from sqlalchemy import delete

async def reset_database():
    print("Conectando ao banco de dados...")
    
    async with async_session() as session:
        try:
            # Deletar na ordem inversa das dependências
            print("Removendo placas perdidas...")
            await session.execute(delete(LostPlate))
            
            print("Removendo categorias...")
            await session.execute(delete(ScheduleCategory))
            
            print("Removendo capacidades...")
            await session.execute(delete(ScheduleCapacity))
            
            print("Removendo agendamentos...")
            result = await session.execute(delete(Schedule))
            
            await session.commit()
            print(f"Concluído! {result.rowcount} agendamentos foram removidos com sucesso.")
            
        except Exception as e:
            print(f"Erro ao limpar banco de dados: {e}")
            await session.rollback()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(reset_database())