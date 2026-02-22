from database import SessionLocal, engine
import models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

print("Dropping legacy users table to inject roles schema...")
# Drops only the users and roles table to avoid clearing out actual Timesheet Data
models.User.__table__.drop(engine, checkfirst=True)
models.Role.__table__.drop(engine, checkfirst=True)

print("Recreating users and roles tables...")
models.Base.metadata.create_all(bind=engine)

# 1. Create Default Roles
admin_role = models.Role(name="Admin", can_manage_settings=True, can_edit_all=True, can_view_only=False)
manager_role = models.Role(name="Manager", can_manage_settings=False, can_edit_all=True, can_view_only=False)
viewer_role = models.Role(name="Viewer", can_manage_settings=False, can_edit_all=False, can_view_only=True)

db.add_all([admin_role, manager_role, viewer_role])
db.commit()
db.refresh(admin_role)
db.refresh(manager_role)

# 2. Create Default Users assigned to those Roles
if not db.query(models.User).filter_by(username="admin").first():
    admin = models.User(username="admin", hashed_password=pwd_context.hash("admin"), role_id=admin_role.id, dept_id=None)
    db.add(admin)

if not db.query(models.User).filter_by(username="manager").first():
    # Attempt to find the Transport department
    transport = db.query(models.Department).filter_by(name="Transport Service").first()
    dept_id = transport.id if transport else 1
    manager = models.User(username="manager", hashed_password=pwd_context.hash("manager"), role_id=manager_role.id, dept_id=dept_id)
    db.add(manager)

db.commit()
print("Users successfully recreated: admin/admin, manager/manager")
print("Dynamic roles schema established.")
db.close()
