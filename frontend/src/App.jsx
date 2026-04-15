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
      {/* 🔥 Premium Dark Theme Base */}
      <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500/30">
        
        {/* ✨ Ambient Gradient Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/30 via-gray-950 to-purple-950/30 -z-10" />
        <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

        {/* 🧭 Navigation */}
        <Navbar />

        {/* 🎯 Main Content Area */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          
          {loading ? (
            // 🔹 Premium Loading Skeleton
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                <p className="text-gray-400 animate-pulse">Connecting to AI platform…</p>
              </div>
            </div>
          ) : error ? (
            // 🔹 Premium Error State
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 md:p-8 max-w-md w-full text-center backdrop-blur-sm animate-glow-red">
                <div className="text-4xl mb-3">⚠️</div>
                <h2 className="text-xl font-semibold text-red-400 mb-2">Connection Error</h2>
                <p className="text-red-300/80 text-sm">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-all duration-300 border border-red-500/30"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          ) : (
            // 🔹 Route Views (Logic Preserved)
            <Routes>
              <Route path="/" element={<HomeDashboard data={data} />} />
              <Route path="/monitor" element={<LiveMonitor data={data} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>

        {/* ✨ Footer Glow */}
        <footer className="relative z-10 text-center py-6 text-gray-500 text-xs">
          <span className="bg-gray-900/50 px-3 py-1 rounded-full border border-gray-800">
            AI Energy Theft Detection • v2.0
          </span>
        </footer>
      </div>
    </BrowserRouter>
  );
}