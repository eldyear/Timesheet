import os
import sys
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from passlib.context import CryptContext

def seed_data():
    db = SessionLocal()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    try:
        # Check if basic data already exists
        if db.query(models.Department).first():
            print("Database already contains departments. Checking for Admin role and Superuser...")
            admin_role = db.query(models.Role).filter((models.Role.name == "Admin") | (models.Role.name == "admin")).first()
            if not admin_role:
                admin_role = models.Role(name="Admin", can_manage_settings=True, can_edit_all=True, can_view_only=False)
                db.add(admin_role)
                db.commit()
                db.refresh(admin_role)
                
            if not db.query(models.User).filter((models.User.username == "Superuser") | (models.User.username == "superuser")).first():
                superuser = models.User(
                    username="Superuser",
                    hashed_password=pwd_context.hash("admin"),
                    role_id=admin_role.id,
                    dept_id=None
                )
                db.add(superuser)
                db.commit()
                print("Superuser created successfully. (username: Superuser, password: admin)")
            else:
                print("Superuser already exists. Skipping.")
            return

        # 1. Create WorkCodes
        work_codes = [
            models.WorkCode(code='8', label='Standard 8h', hours_standard=8.0, hours_night=0.0, color_hex='#E2E8F0'),
            models.WorkCode(code='Д', label='Day 12h', hours_standard=12.0, hours_night=0.0, color_hex='#FEF08A'),
            models.WorkCode(code='Н', label='Night 12h', hours_standard=8.0, hours_night=4.0, color_hex='#DDD6FE'),
            models.WorkCode(code='О', label='Vacation', hours_standard=0.0, hours_night=0.0, color_hex='#BBF7D0'),
            models.WorkCode(code='К', label='Business Trip', hours_standard=0.0, hours_night=0.0, color_hex='#BFDBFE'),
        ]
        db.add_all(work_codes)
        db.flush() # To get IDs if necessary

        # 2. Create Departments
        mgmt = models.Department(name="Management")
        acc = models.Department(name="Accounting")
        hr = models.Department(name="HR")
        ops = models.Department(name="Operations")

        db.add_all([mgmt, acc, hr, ops])
        db.flush()

        transport = models.Department(name="Transport Service", parent_id=ops.id)
        db.add(transport)
        db.flush()

        # 3. Create Employees
        managers = [
            models.Employee(full_name="Ivanov Ivan Ivanovich", tab_number="M-001", dept_id=mgmt.id),
            models.Employee(full_name="Petrova Anna Ivanovna", tab_number="M-002", dept_id=mgmt.id),
        ]
        
        transport_employees = [
            models.Employee(full_name="Smirnov Alexey", tab_number="T-001", dept_id=transport.id),
            models.Employee(full_name="Kuznetsov Petr", tab_number="T-002", dept_id=transport.id),
            models.Employee(full_name="Sokolov Mikhail", tab_number="T-003", dept_id=transport.id),
            models.Employee(full_name="Popov Dmitry", tab_number="T-004", dept_id=transport.id),
            models.Employee(full_name="Lebedev Sergey", tab_number="T-005", dept_id=transport.id),
        ]

        db.add_all(managers)
        # 4. Create Roles and Superuser
        admin_role = models.Role(name="Admin", can_manage_settings=True, can_edit_all=True, can_view_only=False)
        db.add(admin_role)
        db.flush()

        superuser = models.User(
            username="Superuser",
            hashed_password=pwd_context.hash("admin"),
            role_id=admin_role.id,
            dept_id=None
        )
        db.add(superuser)
        
        db.commit()

        print("Database seeded successfully with Superuser!")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)
    seed_data()
