import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Build identical string as database.py
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', 'postgres')}@{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'timesheet')}"
)

# Use psycopg2 adapter directly
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def column_exists(conn, table_name, column_name):
    result = conn.execute(text(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='{table_name}' AND column_name='{column_name}'
    """))
    return result.fetchone() is not None

print("Running employee category migration...")

with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    # 1. Add category to employees
    if not column_exists(conn, "employees", "category"):
        conn.execute(text("""
            ALTER TABLE employees
            ADD COLUMN category INTEGER DEFAULT 99
        """))
        print("✓ 'category' column added to employees table")
    else:
        print("  (skip) 'category' column already exists in employees table")
        
    # 2. Drop category from positions (if exists)
    if column_exists(conn, "positions", "category"):
        conn.execute(text("""
            ALTER TABLE positions
            DROP COLUMN category
        """))
        print("✓ 'category' column removed from positions table")
    else:
        print("  (skip) 'category' column already removed from positions table")

print("\n✓ Employee category migration complete!")
