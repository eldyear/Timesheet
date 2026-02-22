FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Expose API port
EXPOSE 8000

# On start: run migrations, seed, then launch server
CMD ["sh", "-c", "python database.py && python migrate_positions.py && python migrate_finance.py && python migrate_employee_category.py && python migrate_phase11.py && python seed.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
