import asyncio
import os
from sqlalchemy import text
from app.database import engine, Base

async def upgrade_database():
    """Automated migration script that adds new tables and columns without dropping data.

    - Creates any tables that didn't exist (schedule_capacities, schedule_capacity_spots, etc.)
    - Adds the `reason` column to `lost_plates` if missing.
    - Adds the `profile_name` column to `schedule_categories` if missing.

    Run this script after pulling the latest changes to bring an existing database up to date.
    It is safe to run multiple times.
    """
    print("Running database upgrade...")
    print(f"Using DATABASE_URL={os.getenv('DATABASE_URL')}")
    try:
        async with engine.connect() as conn:
            # Transaction for initial table creation
            async with conn.begin():
                await conn.run_sync(Base.metadata.create_all)

            is_sqlite = conn.dialect.name == 'sqlite'

            # --- Add 'reason' column to lost_plates ---
            async with conn.begin():
                has_column = False
                if is_sqlite:
                    result = await conn.execute(text("PRAGMA table_info('lost_plates')"))
                    columns = [row[1] for row in result.all()]
                    if 'reason' in columns:
                        has_column = True
                else: # PostgreSQL and other DBs
                    res = await conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lost_plates' AND column_name = 'reason')"))
                    if res.scalar():
                        has_column = True
                
                if not has_column:
                    print("Adding 'reason' column to lost_plates table")
                    if is_sqlite:
                        await conn.execute(text("ALTER TABLE lost_plates ADD COLUMN reason TEXT DEFAULT ''"))
                    else:
                        await conn.execute(text("ALTER TABLE lost_plates ADD COLUMN reason VARCHAR(255) DEFAULT ''"))

            # --- Add 'profile_name' column to schedule_categories ---
            async with conn.begin():
                has_column = False
                if is_sqlite:
                    result = await conn.execute(text("PRAGMA table_info('schedule_categories')"))
                    columns = [row[1] for row in result.all()]
                    if 'profile_name' in columns:
                        has_column = True
                else: # PostgreSQL and other DBs
                    res = await conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedule_categories' AND column_name = 'profile_name')"))
                    if res.scalar():
                        has_column = True

                if not has_column:
                    print("Adding 'profile_name' column to schedule_categories table")
                    if is_sqlite:
                        await conn.execute(text("ALTER TABLE schedule_categories ADD COLUMN profile_name TEXT DEFAULT ''"))
                    else:
                        await conn.execute(text("ALTER TABLE schedule_categories ADD COLUMN profile_name VARCHAR(255) DEFAULT ''"))

    except Exception as e:
        print(f"Erro ao atualizar banco de dados: {e}")
        print("Verifique a conexão com o banco (DATABASE_URL), talvez ele não esteja acessível a partir deste host.")
    finally:
        await engine.dispose()
    print("Database upgrade complete.")

if __name__ == '__main__':
    # windows event loop fix
    import os
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(upgrade_database())
