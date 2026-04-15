export default function StatCard({ title, value, icon, isAlert }) {
  return (
    <div style={{...styles.card, border: isAlert ? "2px solid #ffcccc" : "1px solid #f1f5f9", background: isAlert ? "#fff5f5" : "#ffffff"}}>
      <div style={styles.flex}>
        <div>
          <p style={styles.title}>{title}</p>
          <h3 style={{...styles.value, color: isAlert ? "#e74c3c" : "#1e293b"}}>{value}</h3>
        </div>
        <div style={styles.iconBox}>
          {icon}
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: { flex: 1, minWidth: "200px", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "transform 0.2s" },
  flex: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: "0.85rem", fontWeight: 600, color: "#64748b", margin: "0 0 4px" },
  value: { fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  iconBox: { background: "#f8fafc", padding: "10px", borderRadius: "10px", display: "flex" }
};
