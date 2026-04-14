import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/data').catch(() => null);
      if (!res || !res.ok) {
        // Mock data fallback for demo when API isn't running
        const now = Date.now();
        const mock = Array.from({ length: 15 }, (_, i) => ({
          device_id: 'meter_1',
          consumption: +(90 + Math.random() * 30 + (Math.random() > 0.85 ? 50 : 0)).toFixed(1),
          is_anomaly: Math.random() > 0.85,
          timestamp: new Date(now - (14 - i) * 3000).toISOString()
        }));
        setData(mock);
      } else {
        setData(await res.json());
      }
      setError(null);
    } catch (err) {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    if (!data.length) return { current: 0, total: 0, status: 'NORMAL', hasAnomaly: false };
    const current = data[data.length - 1].consumption;
    const total = data.length;
    const hasAnomaly = data.some(d => d.is_anomaly);
    return { current: current.toFixed(1), total, status: hasAnomaly ? 'ALERT' : 'NORMAL', hasAnomaly };
  }, [data]);

  const chartData = useMemo(() => {
    const labels = data.map(d => formatTime(d.timestamp));
    const values = data.map(d => d.consumption);
    const pointColors = data.map(d => d.is_anomaly ? '#ef4444' : '#818cf8');
    const pointRadius = data.map(d => d.is_anomaly ? 7 : 4);

    return {
      labels,
      datasets: [{
        label: 'Energy Consumption (kW)',
        data: values,
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129, 140, 248, 0.08)',
        borderWidth: 2,
        pointBackgroundColor: pointColors,
        pointRadius: pointRadius,
        pointHoverRadius: 9,
        tension: 0.4,
        fill: true,
      }]
    };
  }, [data]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      x: { grid: { color: 'rgba(55, 65, 81, 0.25)' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
      y: { grid: { color: 'rgba(55, 65, 81, 0.25)' }, ticks: { color: '#9ca3af', font: { size: 11 } } }
    },
    interaction: { intersect: false, mode: 'index' }
  };

  if (loading && !data.length) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-10 w-64 bg-gray-800 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-pulse">
                <div className="h-4 w-24 bg-gray-700 rounded mb-3" />
                <div className="h-8 w-16 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-pulse h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans p-4 md:p-8 selection:bg-indigo-500/30">
      {/* Ambient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/20 via-gray-950 to-purple-950/20 -z-10" />
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AI Energy Theft Detection
            </h1>
            <p className="text-gray-400 text-sm mt-1">Real-time consumption monitoring & anomaly tracking</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-semibold text-sm tracking-wide border transition-all duration-300 ${
            stats.status === 'ALERT' 
              ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-glow-red' 
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
          }`}>
            {stats.status}
          </div>
        </header>

        {/* Alert Banner */}
        {stats.hasAnomaly && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-glow-red transition-all">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-red-400 font-semibold">Energy Theft Suspected</h3>
              <p className="text-red-300/70 text-sm">Anomalous consumption pattern detected. Review meter data immediately.</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Current Consumption" value={`${stats.current} kW`} icon="⚡" color="blue" />
          <StatCard title="Total Readings" value={stats.total} icon="📊" color="purple" />
          <StatCard title="Anomaly Status" value={stats.status === 'ALERT' ? 'Critical' : 'Stable'} icon={stats.status === 'ALERT' ? '🚨' : '✅'} color={stats.status === 'ALERT' ? 'red' : 'green'} />
        </div>

        {/* Chart */}
        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-6 hover:border-indigo-500/30 transition-all duration-300 shadow-lg shadow-black/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-200">Consumption Trend</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded border border-gray-700">Live • 3s refresh</span>
          </div>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
          {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// Inline StatCard for minimal files
function StatCard({ title, value, icon, color }) {
  const gradients = {
    blue: 'from-blue-500/10 to-transparent border-blue-500/20 hover:border-blue-400 hover:shadow-blue-500/15',
    purple: 'from-purple-500/10 to-transparent border-purple-500/20 hover:border-purple-400 hover:shadow-purple-500/15',
    green: 'from-emerald-500/10 to-transparent border-emerald-500/20 hover:border-emerald-400 hover:shadow-emerald-500/15',
    red: 'from-red-500/10 to-transparent border-red-500/20 hover:border-red-400 hover:shadow-red-500/15',
  };
  const cls = gradients[color] || gradients.blue;

  return (
    <div className={`relative bg-gradient-to-br ${cls} border rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-default group`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-100">{value}</h3>
        </div>
        <div className="text-2xl opacity-80 group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />
    </div>
  );
}