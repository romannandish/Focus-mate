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
import StreakCalendar from "../components/StreakCalendar";

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

const Analytics = () => {
  const [sessionData, setSessionData] = useState([]);
  const [distractionData, setDistractionData] = useState({});
  const [peakTime, setPeakTime] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, []);

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
        label: "Focus Time (seconds)",
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
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} sec`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#4b5563", font: { weight: "bold" } },
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
        backgroundColor: [
          "#ef4444", // red-500
          "#f97316", // orange-500
          "#22c55e", // green-500
          "#6366f1", // indigo-500
          "#14b8a6", // teal-500
          "#a855f7", // purple-500
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom", labels: { color: "#4b5563" } },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed} sec`,
        },
      },
    },
  };

  return (
    <main className="min-h-screen bg-gradient-to-tr from-sky-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white">
            📊 Focus Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Visualize your productivity trends and habits
          </p>
        </header>

        {/* Line Chart */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-6">
            📈 Focus Trend (Last 7 Days)
          </h2>
          {cleanedData.length > 0 ? (
            <Line data={lineChartData} options={lineChartOptions} />
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">
              No data available for the past 7 days.
            </p>
          )}
        </section>

        {/* Pie Chart */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-rose-600 dark:text-rose-400 mb-6 text-center">
            🚫 Distraction Breakdown
          </h2>
          <div className="max-w-md mx-auto">
            {Object.keys(distractionData).length > 0 ? (
              <Pie data={pieChartData} options={pieChartOptions} />
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No distraction data available.
              </p>
            )}
          </div>
        </section>

        {/* Streak Calendar */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mb-6">
            🔥 Focus Streaks
          </h2>
          <StreakCalendar />
        </section>

        {/* Insights */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mb-4">
            🔍 Peak Focus Insights
          </h2>
          <p className="text-gray-700 dark:text-gray-300 text-lg">
            ⏰ <strong>Peak Focus Time:</strong>{" "}
            <span className="font-medium text-indigo-600 dark:text-indigo-300">
              {peakTime}
            </span>
          </p>
        </section>

      </div>
    </main>
  );
};

export default Analytics;
