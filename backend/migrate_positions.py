"""
Migration: Add positions table and position_id FK to employees.
Safe to run on a live PostgreSQL database — does NOT drop any existing table.
"""
from database import engine
from sqlalchemy import text

def column_exists(conn, table_name, column_name):
    query = text(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='{table_name}' and column_name='{column_name}'
    """)
    return conn.execute(query).scalar() is not None

with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    # 1. Create the positions table if it doesn't exist (PostgreSQL syntax)
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS positions (
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL UNIQUE
        )
    """))
    print("✓ positions table ready")

    # 2. Add position_id column to employees if it doesn't already exist
    if not column_exists(conn, "employees", "position_id"):
        conn.execute(text("""
            ALTER TABLE employees
            ADD COLUMN position_id INTEGER REFERENCES positions(id)
        """))
        print("✓ position_id column added to employees")
    else:
        print("  position_id column already exists, skipping")

    print("\nMigration complete!")
    print("Tip: Open the 'Positions' admin tab to add positions, then edit employees to assign them.")
