import { Server, Plus, CheckCircle2 } from "lucide-react";

export default function DeviceSelector() {
  return (
    <div style={styles.card}>
      <div>
        <h3 style={styles.title}>Device Selection</h3>
        <p style={styles.subtitle}>Connect and manage your energy sensors.</p>
        
        <div style={styles.deviceList}>
          <div style={styles.activeDevice}>
            <div style={styles.flex}>
              <Server color="#3498db" size={20} />
              <div>
                <p style={styles.deviceName}>Raspberry Pi - Apt 201</p>
                <p style={styles.status}><span style={styles.dot}></span> Online</p>
              </div>
            </div>
            <CheckCircle2 color="#3498db" size={20} />
          </div>

          <button style={styles.disabledBtn} disabled>
            <Plus color="#a1a1aa" size={18} /> Add New Device
          </button>
        </div>
      </div>
      <p style={styles.footerText}>Link additional sensors to expand monitoring coverage.</p>
    </div>
  );
}

const styles = {
  card: { background: "#ffffff", borderRadius: "16px", padding: "24px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", boxSizing: "border-box" },
  title: { fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", margin: "0 0 4px" },
  subtitle: { fontSize: "0.85rem", color: "#64748b", margin: "0 0 16px" },
  deviceList: { display: "flex", flexDirection: "column", gap: "12px" },
  activeDevice: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#f0f9ff", border: "2px solid #7dd3fc", borderRadius: "10px" },
  flex: { display: "flex", alignItems: "center", gap: "12px" },
  deviceName: { margin: "0 0 2px", fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" },
  status: { margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: "6px" },
  dot: { width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" },
  disabledBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px", border: "2px dashed #cbd5e1", borderRadius: "10px", background: "transparent", color: "#64748b", fontWeight: 600, fontSize: "0.9rem", cursor: "not-allowed", opacity: 0.7 },
  footerText: { fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic", textAlign: "center", marginTop: "24px", margin: 0 }
};
