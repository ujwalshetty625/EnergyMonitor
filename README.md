# ⚡ EnergyMonitor 

EnergyMonitor is an AI-Based Smart Energy Theft Detection system designed to monitor power consumption in real-time and flag anomalous energy usage patterns using a modern React frontend and a lightweight Express backend.

The system natively interfaces with IoT edge devices (such as a Raspberry Pi) to ingest power consumption data over HTTP and visualize it on a dynamic dashboard.

## 🚀 Project Architecture
- **Frontend Dashboard:** React + Vite, visualizing live incoming data using beautiful SVG graphs.
- **Backend API:** Node.js + Express, providing REST endpoints (`GET /api/data`, `POST /api/data`) to act as the central hub between the hardware and the dashboard.
- **Hardware Integration:** Any edge hardware capable of running a Python script (Raspberry Pi, BeagleBone, etc.) to simulate or read true energy usage.

## 🛠️ How to Run Your System

### Step 1: Start the Backend Layer
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies (only needed the first time):
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   node server.js
   ```
*The server will run on `http://0.0.0.0:5001`, waiting for hardware data and frontend requests. Behind the scenes, it internally simulates generic data every 5 seconds if hardware is unavailable.*

### Step 2: Start the Frontend Dashboard
1. Open a separate terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies (only needed the first time):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173/` (or whatever address Vite provides in the console).

### Step 3: Connect Hardware
For full end-to-end integration with a Raspberry Pi sending data into the dashboard, please refer to the dedicated [`raspberry_setup.md`](./raspberry_setup.md) guide included in this repository.