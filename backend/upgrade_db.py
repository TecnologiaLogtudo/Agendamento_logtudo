import asyncio
import os
from sqlalchemy import text
from app.database import engine, Base

async def upgrade_database():
    """Automated migration script that adds new tables and columns without dropping data.

    - Creates any tables that didn't exist (schedule_capacities, schedule_capacity_spots, etc.)
    - Adds the `reason` column to `lost_plates` if missing.

    Run this script after pulling the latest changes to bring an existing database up to date.
    It is safe to run multiple times.
    """
    print("Running database upgrade...")
    print(f"Using DATABASE_URL={os.getenv('DATABASE_URL')}")
    try:
        async with engine.begin() as conn:
            # create any new tables defined in models (SQLAlchemy will skip existing ones)
            await conn.run_sync(Base.metadata.create_all)

            # ensure `reason` column exists on lost_plates
            try:
                result = await conn.execute(text("PRAGMA table_info('lost_plates')"))
                columns = [row[1] for row in result.all()]
                if 'reason' not in columns:
                    print("Adding 'reason' column to lost_plates table")
                    await conn.execute(text("ALTER TABLE lost_plates ADD COLUMN reason TEXT DEFAULT ''"))
            except Exception as exc:
                # if PRAGMA fails (database not sqlite) attempt generic alter
                try:
                    await conn.execute(text("ALTER TABLE lost_plates ADD COLUMN reason VARCHAR(255) DEFAULT ''"))
                except Exception:
                    # ignore if column already exists or database doesn't support simple alter
                    pass

            # ensure `profile_name` column exists on schedule_categories
            try:
                result = await conn.execute(text("PRAGMA table_info('schedule_categories')"))
                columns = [row[1] for row in result.all()]
                if 'profile_name' not in columns:
                    print("Adding 'profile_name' column to schedule_categories table")
                    await conn.execute(text("ALTER TABLE schedule_categories ADD COLUMN profile_name TEXT DEFAULT ''"))
            except Exception:
                try:
                    await conn.execute(text("ALTER TABLE schedule_categories ADD COLUMN profile_name VARCHAR(255) DEFAULT ''"))
                except Exception:
                    pass
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
