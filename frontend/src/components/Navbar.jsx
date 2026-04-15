import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-gray-950/80 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
            ⚡
          </div>
          <span className="text-lg font-semibold text-gray-100">
            EnergyMonitor
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-2">

          <Link
            to="/"
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              location.pathname === "/"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Dashboard
          </Link>

          <Link
            to="/monitor"
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              location.pathname === "/monitor"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Live Monitor
          </Link>

        </div>
      </div>
    </nav>
  );
}