// EnergyMonitor/frontend/src/App.jsx
// Replace your entire App.jsx with this file.

import { useEffect, useState, useRef } from "react";

const API_URL = "http://localhost:5001/api/data";
const POLL_INTERVAL = 5001; // fetch new data every 5 seconds

export default function App() {
  const [data, setData] = useState(null);       // { latest, history, totalReadings }
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
      setError("Failed to connect to backend. Is the server running on port 5001?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.center}>
        <p style={styles.muted}>Connecting to backend…</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorBox}>
          <p style={{ margin: 0, fontWeight: 600 }}>⚠ Connection Error</p>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{error}</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#888" }}>
            Run <code>node server.js</code> in the backend folder, then refresh.
          </p>
        </div>
      </div>
    );
  }

  const { latest, history, totalReadings } = data;

  // ── Main dashboard ────────────────────────────────────────
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>⚡ Energy Monitor</h1>
      <p style={styles.subtitle}>AI-Based Smart Energy Theft Detection</p>

      {/* Stat cards */}
      <div style={styles.cardRow}>
        <StatCard label="Current Consumption" value={`${latest.current} kW`} />
        <StatCard label="Total Readings" value={totalReadings} />
        <StatCard
          label="Anomaly Status"
          value="⏳ Pending ML"
          color="#888"
        />
      </div>

      {/* Live trend graph */}
      <div style={styles.graphCard}>
        <h2 style={styles.graphTitle}>Live Consumption Trend (last 20 readings)</h2>
        <MiniGraph history={history} />
      </div>

      {/* Last updated */}
      <p style={styles.muted}>
        Last updated: {new Date(latest.timestamp).toLocaleTimeString()} · refreshes every 5 s
      </p>
    </div>
  );
}

// ── StatCard component ────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={styles.card}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={{ ...styles.cardValue, color: color || "#2c3e50" }}>{value}</p>
    </div>
  );
}

// ── MiniGraph component (pure SVG, no extra library needed) ───────────────────
function MiniGraph({ history }) {
  if (!history || history.length < 2) return <p style={styles.muted}>Collecting data…</p>;

  const W = 700;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = history.map((r) => r.current);
  const minV = 0;
  const maxV = Math.max(10, ...values);

  const xStep = innerW / (history.length - 1);
  const toX = (i) => PAD.left + i * xStep;
  const toY = (v) => PAD.top + innerH - ((v - minV) / (maxV - minV)) * innerH;

  const pathD = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");

  const THRESHOLD = 5;
  const thresholdY = toY(THRESHOLD);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {/* Threshold line */}
      <line
        x1={PAD.left} y1={thresholdY}
        x2={W - PAD.right} y2={thresholdY}
        stroke="#e74c3c" strokeWidth={1.5} strokeDasharray="6 4"
      />
      <text x={W - PAD.right + 4} y={thresholdY + 4} fontSize={11} fill="#e74c3c">
        {THRESHOLD} kW
      </text>

      {/* Line chart */}
      <path d={pathD} fill="none" stroke="#2980b9" strokeWidth={2} strokeLinejoin="round" />

      {/* Data points */}
      {history.map((r, i) => (
        <circle
          key={`${r.timestamp}-${i}`}
          cx={toX(i)}
          cy={toY(r.current)}
          r={4}
          fill="#2980b9"
        />
      ))}

      {/* Y-axis label */}
      <text
        x={PAD.left - 8} y={PAD.top + innerH / 2}
        fontSize={11} fill="#888" textAnchor="middle"
        transform={`rotate(-90, ${PAD.left - 30}, ${PAD.top + innerH / 2})`}
      >
        kW
      </text>

      {/* X-axis: first and last timestamp */}
      <text x={PAD.left} y={H - 8} fontSize={10} fill="#aaa" textAnchor="middle">
        {new Date(history[0].timestamp).toLocaleTimeString()}
      </text>
      <text x={W - PAD.right} y={H - 8} fontSize={10} fill="#aaa" textAnchor="middle">
        {new Date(history[history.length - 1].timestamp).toLocaleTimeString()}
      </text>
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "32px 16px",
    fontFamily: "system-ui, sans-serif",
    color: "#2c3e50",
  },
  title: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 15, color: "#888", marginTop: 4, marginBottom: 28 },
  cardRow: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 },
  card: {
    flex: 1,
    minWidth: 160,
    background: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: "16px 20px",
  },
  cardLabel: { fontSize: 13, color: "#888", margin: "0 0 6px" },
  cardValue: { fontSize: 24, fontWeight: 600, margin: 0 },
  graphCard: {
    background: "#f8f9fa",
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: "16px 20px",
    marginBottom: 16,
  },
  graphTitle: { fontSize: 15, fontWeight: 600, margin: "0 0 12px" },
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
  },
  muted: { fontSize: 13, color: "#aaa", textAlign: "center" },
};
