import { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function Graph({ history }) {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return null;

    return {
      labels: history.map(p => formatTime(p.timestamp)),
      datasets: [
        {
          label: " Power (kW)",
          data: history.map(p => p.current),
          borderColor: "#3b82f6", // tailwind blue-500
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, "rgba(59, 130, 246, 0.4)");
            gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");
            return gradient;
          },
          pointBackgroundColor: history.map(p => p.anomaly ? "#ef4444" : "#3b82f6"), // red-500 if anomaly
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: history.map(p => p.anomaly ? 6 : 4),
          pointHoverRadius: 8,
          tension: 0.3, // smooth cubic interpolation
          fill: true,
          borderWidth: 2.5
        }
      ]
    };
  }, [history]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleFont: { size: 13, family: 'system-ui' },
        bodyFont: { size: 14, weight: 'bold', family: 'system-ui' },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.parsed.y} kW`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { family: 'system-ui', size: 11 } },
        title: { display: true, text: 'Time (s)', color: '#9ca3af', font: { size: 12 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { color: '#6b7280', font: { family: 'system-ui' }, padding: 8 },
        title: { display: true, text: 'Power (kW)', color: '#9ca3af', font: { size: 12 } },
        beginAtZero: true,
        suggestedMax: 10
      }
    }
  };

  if (!chartData) {
    return <div className="h-full w-full flex items-center justify-center text-gray-400">Loading graph data...</div>;
  }

  return <Line data={chartData} options={options} />;
}
