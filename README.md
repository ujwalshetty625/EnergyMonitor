# ⚡ EnergyMonitor: ML-Based IoT Energy Theft Detection System

EnergyMonitor is an enterprise-grade AI-Based Smart Energy Theft Detection ecosystem. It continuously monitors live power consumption, persists real-time telemetry into the cloud, and utilizes machine learning inference natively to predict and flag anomalous energy usage patterns. 

This project bridges edge IoT hardware, predictive AI logic, and a scalable cloud data architecture entirely observable via a multi-page React application.

## 🚀 System Architecture

- **Frontend Application (React + Vite):** A multi-page, scalable application utilizing `react-router-dom` for navigation, `tailwindcss` for robust layout modeling (with solid inline rendering), and `chart.js` to process dynamic data arrays visualizing analytical load limits.
- **Backend Hub (Node.js + Express):** A hardened REST architecture utilizing ES Modules. The backend acts as the critical traffic director: proxying secure IoT data payloads via HMAC-SHA256 signatures, managing in-memory caching fallback, and acting as the orchestrator to physically invoke python sub-processes.
- **Machine Learning Layer (TensorFlow/Keras):** A deployed `LSTM` (Long Short-Term Memory) neural network script nested on the server. Node sequentially passes recent network metrics to the model, which calculates reconstruction errors relative to a dynamically loaded mean scalar to determine energy abnormalities.
- **Data Persistence (MongoDB Atlas):** Fully realized cloud integration managed globally by `mongoose`. Legitimate hardware pings, coupled with the ML algorithm's output fields (`anomaly`, `confidence`), are continuously offloaded to cloud collections.
- **Hardware Integrations:** Any edge hardware capable of running an HTTP sender. Configured natively for Python-based simulation via Raspberry Pi `iot_sender.py`.

## 🛠️ How to Run Your System

### Step 1: Start the Backend Cloud Layer
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies (First-time only):
   ```bash
   npm install mongoose dotenv express cors
   ```
3. Boot the environment:
   ```bash
   node server.js
   ```
*The server will mount to `0.0.0.0:5001`, establish a bridge to MongoDB via your `.env`, and begin monitoring the ML anomaly pipeline.*

### Step 2: Start the Frontend React Client
1. Open a separate terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install routing and graphing engine:
   ```bash
   npm install react-router-dom lucide-react chart.js react-chartjs-2
   ```
3. Start the Vite UI daemon:
   ```bash
   npm run dev
   ```
4. Access the fully responsive analytical dashboard via `http://localhost:5173/`. Navigate between your Home Overview and Live ML Tracking canvases via the Top Navbar.

### Step 3: Trigger Edge Nodes (Raspberry Pi/Simulator)
For full end-to-end integration and hardware setup (using the provided IoT scripts to transmit metrics into the AI funnel), please refer to the dedicated [`raspberry_setup.md`](./raspberry_setup.md) guide included in this repository.