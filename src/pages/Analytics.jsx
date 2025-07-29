import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { format, parseISO } from "date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);
import StreakCalendar from "../components/StreakCalendar";

const Analytics = () => {
  const [sessionData, setSessionData] = useState([]);
  const [distractionData, setDistractionData] = useState({});
  const [peakTime, setPeakTime] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
  console.log("Fetched sessionData:", sessionData);
}, [sessionData]);


  const fetchAnalytics = async () => {
    try {
      const [sessions, distractions, peak] = await Promise.all([
        axios.get("http://localhost:5000/api/focus/last-7-days"),
        axios.get("http://localhost:5000/api/focus/distractions-summary"),
        axios.get("http://localhost:5000/api/focus/insights/peak"),
      ]);

      setSessionData(sessions.data || []);
      setDistractionData(distractions.data || {});
      setPeakTime(peak.data?.peakTime || peak.data?.peakRange || "N/A");
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const cleanedData = sessionData
    .filter((d) => d?.date && d?.focusSeconds !== undefined)
    .map((d) => ({
      label: format(parseISO(d.date), "MMM d"),
      value: d.focusSeconds,
    }));

  const lineChartData = {
    labels: cleanedData.map((d) => d.label),
    datasets: [
      {
        label: "Focus Time (in seconds)",
        data: cleanedData.map((d) => d.value),
        fill: false,
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "top" },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} sec`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#374151",
          font: { weight: "bold" },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#e5e7eb" },
        ticks: {
          stepSize: 60,
          callback: (value) => `${value}s`,
          color: "#6b7280",
        },
      },
    },
  };

  const pieChartData = {
    labels: Object.keys(distractionData),
    datasets: [
      {
        label: "Distraction Time (sec)",
        data: Object.values(distractionData),
        backgroundColor: ["#ef4444", "#f59e0b", "#10b981", "#6366f1"],
        borderWidth: 1,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed} sec`,
        },
      },
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">📊 Focus Analytics Dashboard</h2>

      {/* Line Chart */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-blue-600 mb-4">
          📆 Focus Trend (Last 7 Days)
        </h3>
        {cleanedData.length > 0 ? (
          <Line data={lineChartData} options={lineChartOptions} />
        ) : (
          <p className="text-gray-500">No data available for the past 7 days.</p>
        )}
      </div>

      {/* Pie Chart */}
      <div className="bg-white rounded-lg shadow p-4 max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-rose-600 mb-4">🚫 Distraction Breakdown</h3>
        <div className="max-w-xs mx-auto">
          {Object.keys(distractionData).length > 0 ? (
            <Pie data={pieChartData} options={pieChartOptions} />
          ) : (
            <p className="text-gray-500">No distraction data available.</p>
          )}
        </div>
      </div>


      <StreakCalendar />


      {/* Insights */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-purple-600 mb-2">🔍 Focus Insights</h3>
        <p className="text-md">
          ⏰ <strong>Peak Focus Time:</strong>{" "}
          <span className="text-gray-700">{peakTime}</span>
        </p>
      </div>
    </div>
  );
};

export default Analytics;
