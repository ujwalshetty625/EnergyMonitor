import { useMemo, useState } from "react"; // ✅ Added useState
import { Link } from "react-router-dom";

export default function HomeDashboard({ data }) {

  // ✅ STEP 1: ADD STATE (TOP OF FILE)
  const [devices, setDevices] = useState([
    { name: "Raspberry Pi - Apt 201", online: true }
  ]);
  const [showInput, setShowInput] = useState(false);
  const [newDevice, setNewDevice] = useState("");

  const stats = useMemo(() => {
    if (!data?.history?.length) return null;

    const readings = data.history;
    const latest = readings[readings.length - 1];

    const avg =
      readings.reduce((a, b) => a + b.current, 0) / readings.length;

    const max = Math.max(...readings.map((r) => r.current));
    const min = Math.min(...readings.map((r) => r.current));

    const anomalyCount = readings.filter(
      (r) => r.current > avg * 1.3
    ).length;

    return {
      latest: latest.current.toFixed(1),
      avg: avg.toFixed(1),
      max: max.toFixed(1),
      min: min.toFixed(1),
      total: readings.length,
      anomalyCount,
      lastUpdate: new Date(latest.timestamp).toLocaleTimeString(),
    };
  }, [data]);

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Waiting for data stream…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* 🔥 HERO + DEVICE PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: HERO */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900/40 to-purple-900/30 border border-gray-800 rounded-2xl p-8 relative overflow-hidden">

          <h1 className="text-2xl md:text-3xl font-bold mb-4 
bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 
bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            Energy Monitoring & Theft Detection
          </h1>

          <ul className="space-y-2 text-gray-300 text-sm">
            <li>⚡ Real-time IoT-based energy tracking</li>
            <li>🗄️ Cloud analytics & MongoDB persistence</li>
            <li>📈 LSTM Machine Learning anomaly prediction</li>
          </ul>

          {/* subtle glow */}
          <div className="absolute right-[-60px] top-[-60px] w-[200px] h-[200px] bg-indigo-500/10 blur-3xl rounded-full" />
        </div>

        {/* RIGHT: DEVICE PANEL — ✅ REPLACED WITH INTERACTIVE VERSION */}
        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-6">

          <div className="space-y-3">

            <h2 className="text-lg font-semibold text-white">
              Device Selection
            </h2>

            <p className="text-sm text-gray-400">
              Connect and manage your energy sensors.
            </p>

            {/* DEVICE LIST */}
            {devices.map((d, i) => (
              <div
                key={i}
                className="border border-indigo-500/40 bg-indigo-500/10 rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-white font-medium">{d.name}</p>
                  <p className="text-green-400 text-sm">● Online</p>
                </div>

                <div className="text-indigo-400 text-xl">✔</div>
              </div>
            ))}

            {/* INPUT BOX */}
            {showInput && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newDevice}
                  onChange={(e) => setNewDevice(e.target.value)}
                  placeholder="Enter device name"
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDevice.trim()) {
                      setDevices([...devices, { name: newDevice, online: true }]);
                      setNewDevice("");
                      setShowInput(false);
                    }
                    if (e.key === 'Escape') {
                      setNewDevice("");
                      setShowInput(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (!newDevice.trim()) return;
                    setDevices([...devices, { name: newDevice, online: true }]);
                    setNewDevice("");
                    setShowInput(false);
                  }}
                  className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-sm text-indigo-300 transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            {/* ADD BUTTON */}
            <div
              onClick={() => setShowInput(!showInput)}
              className="border border-dashed border-gray-700 rounded-xl p-4 text-center text-gray-400 text-sm hover:bg-gray-800/40 hover:border-gray-600 transition cursor-pointer select-none"
            >
              + Add New Device
            </div>

          </div>

        </div>
      </div>

      {/* 🔔 ALERT */}
      {stats.anomalyCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-glow-red">
          <span className="text-2xl">🚨</span>
          <div>
            <h3 className="text-red-400 font-semibold">
              Anomalies Detected
            </h3>
            <p className="text-red-300/70 text-sm">
              {stats.anomalyCount} suspicious readings found
            </p>
          </div>
        </div>
      )}

      {/* 📊 STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Current Load" value={`${stats.latest} kW`} />
        <StatCard title="Average" value={`${stats.avg} kW`} />
        <StatCard title="Peak" value={`${stats.max} kW`} />
        <StatCard title="Readings" value={stats.total} />
      </div>

      {/* 📈 GRAPH */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h2 className="text-gray-200 mb-4">Recent Activity</h2>

        <div className="h-32 flex items-end gap-1">
          {data.history.slice(-20).map((r, i) => {
            const height = Math.min(100, (r.current / stats.max) * 100);
            const isAnomaly = r.current > stats.avg * 1.3;

            return (
              <div
                key={i}
                className={`flex-1 rounded-t ${
                  isAnomaly ? "bg-red-500" : "bg-indigo-500/60"
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* CARD */
function StatCard({ title, value }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-xs">{title}</p>
      <h3 className="text-xl font-bold text-white">{value}</h3>
    </div>
  );
}