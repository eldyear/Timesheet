from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Boolean, select, func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Department(Base):
    __tablename__ = 'departments'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    category = Column(Integer, default=99)
    
    # Recursive tree structure for departments
    parent = relationship("Department", remote_side=[id], backref="children")
    employees = relationship("Employee", back_populates="department")

    @property
    def full_name(self) -> str:
        names = []
        current = self
        while current:
            names.append(current.name)
            current = current.parent
        return " » ".join(reversed(names))

class WorkCode(Base):
    __tablename__ = 'work_codes'
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    label = Column(String, nullable=False)
    hours_standard = Column(Float, default=0.0)
    hours_night = Column(Float, default=0.0)
    color_hex = Column(String, default="#FFFFFF")
    rate_multiplier = Column(Float, default=1.0)  # e.g. 1.0 for standard, 1.5 for night, 2.0 for holiday
    
    timesheets = relationship("Timesheet", back_populates="work_code")

class Position(Base):
    __tablename__ = 'positions'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    
    employees = relationship("Employee", back_populates="position")

class Employee(Base):
    __tablename__ = 'employees'
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    tab_number = Column(String, unique=True, index=True, nullable=False)
    category = Column(Integer, default=99)
    dept_id = Column(Integer, ForeignKey('departments.id'), nullable=False)
    position_id = Column(Integer, ForeignKey('positions.id'), nullable=True)
    
    department = relationship("Department", back_populates="employees")
    position = relationship("Position", back_populates="employees")
    timesheets = relationship("Timesheet", back_populates="employee")
    users = relationship("User", back_populates="employee")

class Timesheet(Base):
    __tablename__ = 'timesheets'
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    work_code_id = Column(Integer, ForeignKey('work_codes.id'), nullable=False)
    
    employee = relationship("Employee", back_populates="timesheets")
    work_code = relationship("WorkCode", back_populates="timesheets")

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    can_manage_settings = Column(Boolean, default=False)     # Full system admin
    can_edit_all = Column(Boolean, default=False)            # Edit all timesheets
    can_view_all = Column(Boolean, default=False)            # View all timesheets
    can_view_only = Column(Boolean, default=True)            # Read-only timesheet access
    can_view_finance = Column(Boolean, default=False)        # View finance panel
    can_edit_finance = Column(Boolean, default=False)        # Edit salary rates
    can_export = Column(Boolean, default=False)              # Download Excel/PDF exports
    can_manage_employees = Column(Boolean, default=False)    # Add/edit/delete employees
    can_manage_users = Column(Boolean, default=False)        # Manage users & roles
    can_manage_departments = Column(Boolean, default=False)  # Manage department tree
    
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    dept_id = Column(Integer, ForeignKey('departments.id'), nullable=True) # Used for managers to lock them to a dept
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=True)
    
    role = relationship("Role", back_populates="users")
    department = relationship("Department")
    employee = relationship("Employee", back_populates="users")

    @property
    def active_dept_id(self):
        return self.employee.dept_id if self.employee else self.dept_id


class SalaryRate(Base):
    """Maps a department+position combination to an hourly rate."""
    __tablename__ = 'salary_rates'

    id = Column(Integer, primary_key=True, index=True)
    dept_id = Column(Integer, ForeignKey('departments.id'), nullable=False)
    position_id = Column(Integer, ForeignKey('positions.id'), nullable=False)
    hourly_rate = Column(Float, nullable=False, default=0.0)

    department = relationship("Department")
    position = relationship("Position")


class FinanceAuditLog(Base):
    """Immutable audit trail for all finance-related changes."""
    __tablename__ = 'finance_audit_log'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    action = Column(String, nullable=False)         # e.g. "UPDATE_RATE", "UPDATE_MULTIPLIER"
    target = Column(String, nullable=False)         # human-readable target ("Position X in Dept Y")
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    timestamp = Column(Date, nullable=False)

    user = relationship("User")


# --- Service Logic for Calculating Timesheet Totals ---
def calculate_employee_hours(session, employee_id: int, start_date, end_date):
    """
    Calculates the total standard and night hours for a given employee within a date range.
    This logic can be used by FastAPI endpoints or Report generation.
    """
    stmt = (
        select(
            func.sum(WorkCode.hours_standard).label("total_standard"),
            func.sum(WorkCode.hours_night).label("total_night")
        )
        .select_from(Timesheet)
        .join(WorkCode, Timesheet.work_code_id == WorkCode.id)
        .where(Timesheet.employee_id == employee_id)
        .where(Timesheet.date >= start_date)
        .where(Timesheet.date <= end_date)
    )
    result = session.execute(stmt).one_or_none()
    
    total_std = result.total_standard or 0.0 if result else 0.0
    total_night = result.total_night or 0.0 if result else 0.0
    
    return {
        "total_standard": total_std,
        "total_night": total_night,
        "total_hours": total_std + total_night
    }

def calculate_department_hours(session, dept_id: int, start_date, end_date):
    """
    Calculates the aggregate totals for all employees in a specific department.
    """
    stmt = (
        select(
            Timesheet.employee_id,
            func.sum(WorkCode.hours_standard).label("total_standard"),
            func.sum(WorkCode.hours_night).label("total_night")
        )
        .select_from(Timesheet)
        .join(WorkCode, Timesheet.work_code_id == WorkCode.id)
        .join(Employee, Timesheet.employee_id == Employee.id)
        .where(Employee.dept_id == dept_id)
        .where(Timesheet.date >= start_date)
        .where(Timesheet.date <= end_date)
        .group_by(Timesheet.employee_id)
    )
    results = session.execute(stmt).all()
    
    return [
        {
            "employee_id": row.employee_id,
            "total_standard": row.total_standard or 0.0,
            "total_night": row.total_night or 0.0,
            "total_hours": (row.total_standard or 0.0) + (row.total_night or 0.0)
        }
        for row in results
    ]
