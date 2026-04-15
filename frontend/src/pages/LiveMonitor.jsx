import Graph from "../components/Graph";

export default function LiveMonitor({ data }) {
  if (!data) return null;

  const { history, latest } = data;
  const isAlerting = latest?.anomaly;

  return (
    <div className="space-y-6 text-gray-100 max-w-6xl mx-auto px-4 py-8">

      {/* 🔥 Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ⚡ Live AI Monitoring
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time analytical view of standard power draw vs anomalous spikes
          </p>
        </div>

        {/* 🚨 Status Badge */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border backdrop-blur-sm transition-all
            ${
              isAlerting
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-green-500/10 border-green-500/30 text-green-400"
            }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isAlerting ? "bg-red-400 animate-pulse" : "bg-green-400"
            }`}
          />
          {isAlerting
            ? "ANOMALY DETECTED IN STREAM"
            : "DATA STREAM NORMAL"}
        </div>
      </div>

      {/* 📊 Graph Card */}
      <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-6 shadow-lg shadow-black/20 h-[400px]">
        <Graph history={history} />
      </div>

    </div>
  );
}