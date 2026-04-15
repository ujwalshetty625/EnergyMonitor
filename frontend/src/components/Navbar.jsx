import { NavLink } from "react-router-dom";
import { Activity, LayoutDashboard, Zap } from "lucide-react";

export default function Navbar() {
  const getStyle = ({ isActive }) => ({
    display: "flex", alignItems: "center", gap: "8px", 
    padding: "8px 16px", borderRadius: "8px",
    textDecoration: "none", fontWeight: isActive ? 600 : 500,
    backgroundColor: isActive ? "#ebf5fb" : "transparent",
    color: isActive ? "#2980b9" : "#555",
    transition: "background 0.2s"
  });

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <div style={styles.flex}>
          <div style={styles.logoFlex}>
            <div style={styles.logoIcon}>
              <Zap size={20} color="#fff" />
            </div>
            <span style={styles.logoText}>EnergyMonitor</span>
          </div>
          <div style={styles.flex}>
            <NavLink to="/" style={getStyle}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/monitor" style={getStyle}>
              <Activity size={18} />
              <span>Live Monitor</span>
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 50
  },
  container: { maxWidth: 1100, margin: "0 auto", padding: "0 16px" },
  flex: { display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px", gap: "10px" },
  logoFlex: { display: "flex", alignItems: "center", gap: "10px" },
  logoIcon: { backgroundColor: "#3498db", padding: "6px", borderRadius: "8px", display: "flex" },
  logoText: { fontWeight: 700, fontSize: "1.25rem", color: "#1e293b", letterSpacing: "-0.5px" }
};
