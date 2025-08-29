#!/usr/bin/env python3
"""
Migration script to add public_id to existing modules
This should be run once to backfill existing modules with MOD-X public IDs
"""

import asyncio
import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from database.connection import async_session_factory, init_database


async def migrate_module_public_ids():
    """Add public_id to existing modules that don't have one"""
    
    if not async_session_factory:
        database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://nema:nema_password@postgres:5432/nema")
        await init_database(database_url)
    
    async with async_session_factory() as db:
        try:
            # First, check if any modules exist without public_id
            result = await db.execute(
                text("SELECT COUNT(*) FROM module WHERE public_id IS NULL OR public_id = ''")
            )
            count = result.scalar()
            
            if count == 0:
                print("✅ All modules already have public_ids")
                return
            
            print(f"🔄 Found {count} modules without public_ids, updating...")
            
            # Update modules without public_id
            result = await db.execute(text("""
                UPDATE module 
                SET public_id = generate_public_id(workspace_id, 'MOD') 
                WHERE public_id IS NULL OR public_id = ''
            """))
            
            await db.commit()
            
            print(f"✅ Successfully updated {result.rowcount} modules with public IDs")
            
            # Verify the update
            result = await db.execute(
                text("SELECT COUNT(*) FROM module WHERE public_id IS NULL OR public_id = ''")
            )
            remaining = result.scalar()
            
            if remaining > 0:
                print(f"⚠️  Warning: {remaining} modules still missing public_ids")
            else:
                print("✅ All modules now have public_ids")
                
        except Exception as e:
            await db.rollback()
            print(f"❌ Migration failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(migrate_module_public_ids())