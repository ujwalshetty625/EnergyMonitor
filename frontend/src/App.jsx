import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

const generateValue = (history) => {
  const base = history.length ? history[history.length - 1] : 50;
  const noise = (Math.random() - 0.5) * 2;
  const spike = Math.random() < 0.1 ? 20 + Math.random() * 20 : 0;
  return +(base + noise + spike).toFixed(2);
};

export default function App() {
  const [window5, setWindow5] = useState([48, 49, 50, 51, 52]);
  const [points, setPoints] = useState([]);
  const [error, setError] = useState(null);

  const fetchAnomaly = async () => {
    const newVal = generateValue(window5);

    try {
      const res = await fetch("http://localhost:4000/api/anomaly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data: window5,
          new_value: newVal
        })
      });

      const result = await res.json();

      setWindow5(prev => [...prev.slice(1), newVal]);

      setPoints(prev =>
        [
          ...prev,
          {
            value: newVal,
            is_anomaly: result.is_anomaly,
            timestamp: new Date().toISOString()
          }
        ].slice(-20)
      );

      setError(null);
    } catch {
      setError("Backend not reachable");
    }
  };

  useEffect(() => {
    fetchAnomaly();
    const interval = setInterval(fetchAnomaly, 6000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const current = points.length ? points[points.length - 1].value : 0;
    const hasAnomaly = points.some(p => p.is_anomaly);

    return {
      current: current.toFixed(1),
      status: hasAnomaly ? "ALERT" : "NORMAL"
    };
  }, [points]);

  const chartData = {
    labels: points.map(p => formatTime(p.timestamp)),
    datasets: [
      {
        label: "Energy",
        data: points.map(p => p.value),
        borderColor: "#818cf8",
        backgroundColor: "rgba(129,140,248,0.1)",
        pointBackgroundColor: points.map(p =>
          p.is_anomaly ? "#ef4444" : "#818cf8"
        ),
        tension: 0.4,
        fill: true
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-4">⚡ Energy Monitor</h1>

      <div className={`mb-4 p-3 rounded ${stats.status === "ALERT" ? "bg-red-500" : "bg-green-500"}`}>
        {stats.status}
      </div>

      <div className="bg-gray-900 p-4 rounded-xl">
        {points.length > 0 && <Line data={chartData} />}
      </div>

      {error && <p className="text-red-400 mt-3">{error}</p>}
    </div>
  );
}

