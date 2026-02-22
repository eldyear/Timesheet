"""
Migration: Finance Module — adds SalaryRate, FinanceAuditLog tables,
rate_multiplier to work_codes, and can_view_finance/can_edit_finance to roles.
Safe to run on a live PostgreSQL DB — zero table drops, zero data loss.
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
    # 1. Add rate_multiplier to work_codes
    if not column_exists(conn, "work_codes", "rate_multiplier"):
        conn.execute(text("ALTER TABLE work_codes ADD COLUMN rate_multiplier FLOAT DEFAULT 1.0"))
        print("✓ Add rate_multiplier to work_codes")
    else:
        print("  (skip) Add rate_multiplier to work_codes — already exists")

    # 2. Add can_view_finance to roles
    if not column_exists(conn, "roles", "can_view_finance"):
        conn.execute(text("ALTER TABLE roles ADD COLUMN can_view_finance BOOLEAN DEFAULT FALSE"))
        print("✓ Add can_view_finance to roles")
    else:
        print("  (skip) Add can_view_finance to roles — already exists")

    # 3. Add can_edit_finance to roles
    if not column_exists(conn, "roles", "can_edit_finance"):
        conn.execute(text("ALTER TABLE roles ADD COLUMN can_edit_finance BOOLEAN DEFAULT FALSE"))
        print("✓ Add can_edit_finance to roles")
    else:
        print("  (skip) Add can_edit_finance to roles — already exists")

    # 4. Create salary_rates table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS salary_rates (
            id SERIAL PRIMARY KEY,
            dept_id INTEGER NOT NULL REFERENCES departments(id),
            position_id INTEGER NOT NULL REFERENCES positions(id),
            hourly_rate FLOAT NOT NULL DEFAULT 0.0,
            UNIQUE(dept_id, position_id)
        )
    """))
    print("✓ Create salary_rates table")

    # 5. Create finance_audit_log table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS finance_audit_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            action VARCHAR NOT NULL,
            target VARCHAR NOT NULL,
            old_value VARCHAR,
            new_value VARCHAR,
            timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    print("✓ Create finance_audit_log table")

print("\n✓ Finance migration complete!")
print("Next: run the app and go to Roles admin → enable Finance permissions on Admin role.")
