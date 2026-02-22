import os
import sys
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def column_exists(conn, table_name, column_name):
    query = text(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='{table_name}' AND column_name='{column_name}'
    """)
    result = conn.execute(query).fetchone()
    return result is not None

def run_migration():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    print("Running Phase 11 database migrations...")
    
    with engine.begin() as conn:
        # 1. Add employee_id to users
        if not column_exists(conn, "users", "employee_id"):
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL
            """))
            print("✓ 'employee_id' column added to users table")
        else:
            print("  (skip) 'employee_id' column already exists in users table")
            
        # 2. Add can_view_all to roles
        if not column_exists(conn, "roles", "can_view_all"):
            conn.execute(text("""
                ALTER TABLE roles
                ADD COLUMN can_view_all BOOLEAN DEFAULT FALSE
            """))
            print("✓ 'can_view_all' column added to roles table")
        else:
            print("  (skip) 'can_view_all' column already exists in roles table")

        # 3. Add category to departments
        if not column_exists(conn, "departments", "category"):
            conn.execute(text("""
                ALTER TABLE departments
                ADD COLUMN category INTEGER DEFAULT 99
            """))
            print("✓ 'category' column added to departments table")
        else:
            print("  (skip) 'category' column already exists in departments table")

    print("\n✓ Phase 11 migrations complete!")

if __name__ == "__main__":
    run_migration()
