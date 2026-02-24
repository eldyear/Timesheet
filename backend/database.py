import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# 1. Получаем URL из переменной окружения
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost/timesheet_db"
)

# 2. ФИКС ДЛЯ RENDER: заменяем postgres:// на postgresql://
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Создаем движок
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    # На Render это создаст таблицы в облачной БД при первом запуске
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("Tables created successfully!")