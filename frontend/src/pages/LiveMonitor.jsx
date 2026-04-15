import Graph from "../components/Graph";

export default function LiveMonitor({ data }) {
  if (!data) return null;
  const { history, latest } = data;
  const isAlerting = latest.anomaly;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Live AI Monitoring</h1>
          <p style={styles.subtitle}>Real-time analytical view of standard power draw vs anomalous spikes.</p>
        </div>
        <div style={{...styles.badge, background: isAlerting ? "#fef2f2" : "#f0fdf4", color: isAlerting ? "#b91c1c" : "#15803d", border: isAlerting ? "1px solid #fca5a5" : "1px solid #bbf7d0"}}>
           <div style={{...styles.dot, background: isAlerting ? "#ef4444" : "#22c55e", animation: isAlerting ? "pulse 1.5s infinite" : "none"}}></div>
           {isAlerting ? "ANOMALY DETECTED IN STREAM" : "DATA STREAM NORMAL"}
        </div>
      </div>

      <div style={styles.graphCard}>
        <Graph history={history} />
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "32px 16px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "24px" },
  title: { fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "#1e293b" },
  subtitle: { fontSize: "0.95rem", color: "#64748b", margin: "4px 0 0" },
  badge: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  dot: { width: "8px", height: "8px", borderRadius: "50%" },
  graphCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    height: "400px",  // Constrained graph size !!
    boxSizing: "border-box",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
  }
};
