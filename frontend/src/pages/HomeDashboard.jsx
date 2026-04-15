import { ShieldAlert, Zap, Layers, Activity } from "lucide-react";
import StatCard from "../components/StatCard";
import DeviceSelector from "../components/DeviceSelector";

export default function HomeDashboard({ data }) {
  if (!data) return <div style={styles.center}><p style={{color: "#aaa"}}>Connecting to platform...</p></div>;

  const { latest, history, totalReadings } = data;
  const recentAnomalies = history.filter(r => r.anomaly).length;
  const hasAnomaly = latest.anomaly;

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div style={styles.headerBox}>
          <div style={styles.iconOverlay}><ShieldAlert size={120} opacity={0.1} /></div>
          <div style={{ position: "relative", zIndex: 10 }}>
            <h1 style={styles.title}>Energy Monitoring & Theft Detection</h1>
            <div style={styles.featureList}>
              <p style={styles.featureItem}><Zap size={16} color="#f1c40f" /> Real-time IoT-based energy tracking</p>
              <p style={styles.featureItem}><Layers size={16} color="#2ecc71" /> Cloud analytics & MongoDB persistence</p>
              <p style={styles.featureItem}><Activity size={16} color="#e74c3c" /> LSTM Machine Learning anomaly prediction</p>
            </div>
          </div>
        </div>
        <div style={styles.deviceWrapper}>
          <DeviceSelector />
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Real-Time Quick Stats</h2>
      <div style={styles.cardRow}>
        <StatCard title="Current Usage" value={`${latest.current} kW`} icon={<Zap color="#3498db" size={24}/>} isAlert={hasAnomaly} />
        <StatCard title="Processed Readings" value={totalReadings.toLocaleString()} icon={<Layers color="#9b59b6" size={24}/>} />
        <StatCard title="Recent Target Anomalies" value={recentAnomalies} icon={<ShieldAlert color={recentAnomalies > 0 ? "#e74c3c" : "#2ecc71"} size={24}/>} isAlert={recentAnomalies > 0} />
        <StatCard title="System Status" value={hasAnomaly ? "CRITICAL ALERT" : "OPERATIONAL"} icon={hasAnomaly ? <ShieldAlert color="#e74c3c" size={24}/> : <Activity color="#2ecc71" size={24}/>} isAlert={hasAnomaly} />
      </div>
    </div>
  );
}

const styles = {
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  page: { maxWidth: 1100, margin: "0 auto", padding: "32px 16px" },
  topRow: { display: "flex", gap: "24px", marginBottom: "32px", flexWrap: "wrap" },
  headerBox: {
    flex: 2,
    minWidth: "300px",
    background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
    color: "#ffffff",
    padding: "32px",
    borderRadius: "16px",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
    boxSizing: "border-box"
  },
  iconOverlay: { position: "absolute", top: 0, right: 0, padding: "20px" },
  title: { fontSize: "1.8rem", fontWeight: 700, margin: "0 0 16px", letterSpacing: "-0.5px" },
  featureList: { display: "flex", flexDirection: "column", gap: "10px" },
  featureItem: { display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "15px", fontWeight: 500, color: "#d1d5db" },
  deviceWrapper: { flex: 1, minWidth: "280px" },
  sectionTitle: { fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: "0 0 16px" },
  cardRow: { display: "flex", flexWrap: "wrap", gap: "16px", paddingBottom: "8px" }
};
