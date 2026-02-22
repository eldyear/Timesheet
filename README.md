# Timesheet Application MVP (v0.1)

This repository contains the backend and frontend components for the web-based Timesheet Minimum Viable Product.

## 1. Backend API (FastAPI + PostgreSQL)

The backend handles the Database layer, business logic for calculating day/night hours, and REST endpoints for the frontend grid.

**Setup & Execution:**
1. Ensure you have activated your python environment and installed requirements.
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Initialize and Seed the DB (if not already done). This will populate the `Management`, `HR`, `Transport Service` departments, basic employees, and work codes ('8', 'Д', 'Н', 'О', 'К').
   ```bash
   cd backend
   python seed.py
   ```
3. Run the FastAPI development server:
   ```bash
   # From the backend directory
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   > The API will be available at `http://localhost:8000`. You can test endpoints via Swagger UI at `http://localhost:8000/docs`. CORS is automatically enabled for the frontend.

## 2. Frontend Interface (React + Vite)

The frontend features a responsive Sidebar to navigate between the seeded Departments, and a Timesheet Grid with sticky headers mapping real employee records and interactive dropdown timesheet markers.

**Setup & Execution:**
1. Move to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Run the Vite development server:
   ```bash
   npm run dev
   ```
   > By default, the React app will run at `http://localhost:5173`. Open this URL in your browser. Select a Department from the Sidebar (e.g., `Transport Service`) to view the interactive Timesheet grid wired to the backend API!
