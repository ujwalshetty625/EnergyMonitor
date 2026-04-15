import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomeDashboard from "./pages/HomeDashboard";
import LiveMonitor from "./pages/LiveMonitor";

const API_URL = "http://localhost:5001/api/data";
const POLL_INTERVAL = 5000; 

export default function App() {
  const [data, setData] = useState(null);       
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  async function fetchData() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError("Failed to connect to backend. Server port 5001?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <BrowserRouter>
      <div style={styles.appContainer}>
        <Navbar />
        
        {loading ? (
          <div style={styles.center}><p style={{ color: "#aaa" }}>Connecting to platform…</p></div>
        ) : error ? (
          <div style={styles.center}>
            <div style={styles.errorBox}>
              <h2 style={{ margin: "0 0 8px" }}>⚠ Connection Error</h2>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<HomeDashboard data={data} />} />
            <Route path="/monitor" element={<LiveMonitor data={data} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </BrowserRouter>
  );
}

const styles = {
  appContainer: {
    minHeight: "100vh",
    backgroundColor: "#f4f6f8",
    fontFamily: "system-ui, sans-serif",
    color: "#2c3e50"
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  errorBox: {
    background: "#fff5f5",
    border: "1px solid #f5c6cb",
    borderRadius: 10,
    padding: "20px 24px",
    maxWidth: 420,
    textAlign: "center",
    color: "#721c24",
  }
};