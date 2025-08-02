import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const FocusTimer = () => {
  const [sessionBarData, setSessionBarData] = useState([]);
  const [streak, setStreak] = useState(0);
  const [lastSession, setLastSession] = useState(null);
  const [totalToday, setTotalToday] = useState(0);

  useEffect(() => {
    fetchLastSessions();
    fetchStreak();
    fetchLastSession();
    fetchTodayTotal();
  }, []);

  const fetchLastSessions = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/focus/last-sessions");
      const formatted = res.data.map((s, i) => ({
        sessionNumber: `Session ${i + 1}`,
        duration: Math.round((new Date(s.endTime) - new Date(s.startTime)) / 1000),
      }));
      setSessionBarData(formatted);
    } catch (err) {
      console.error("Failed to fetch last sessions", err);
    }
  };

  const fetchStreak = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/focus/streak");
      setStreak(res.data.streak);
    } catch (err) {
      console.error("Failed to fetch streak", err);
    }
  };

  const fetchLastSession = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/focus/last");
      const session = res.data;
      const durationInSec = Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000);
      setLastSession({ ...session, duration: durationInSec });
    } catch (err) {
      console.error("Failed to fetch last session", err);
    }
  };

  const fetchTodayTotal = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/focus/today");
      setTotalToday(Math.round(res.data.totalSeconds));
    } catch (err) {
      console.error("Failed to fetch today's total", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-10 px-4 flex justify-center">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 sm:p-12 space-y-10 transition-all duration-300">

        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">📈 Focus Stats</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your productivity trends</p>
        </header>

        {/* Streak + Last Session + Today Total */}
        <section className="grid gap-6 md:grid-cols-3 text-left">
          <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">🔥 Current Streak</h2>
            <p className="text-blue-700 dark:text-blue-300 font-medium text-lg">
              {streak} day{streak !== 1 && "s"} in a row
            </p>
          </div>

          {lastSession && (
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900 rounded-xl shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">🕒 Last Session</h2>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Start: {new Date(lastSession.startTime).toLocaleTimeString()} <br />
                End: {new Date(lastSession.endTime).toLocaleTimeString()} <br />
                Duration:{" "}
                <span className="font-bold text-yellow-700 dark:text-yellow-300">
                  {lastSession.duration} sec
                </span>
              </p>
            </div>
          )}

          <div className="p-6 bg-green-50 dark:bg-green-950 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">📆 Focus Today</h2>
            <p className="text-green-600 dark:text-green-300 font-medium text-lg">
              {totalToday} second{totalToday !== 1 && "s"}
            </p>
          </div>
        </section>

        {/* Bar Chart */}
        <section className="pt-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">📊 Last 7 Sessions</h2>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-md">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sessionBarData}>
                <XAxis dataKey="sessionNumber" stroke="#8884d8" />
                <YAxis
                  label={{
                    value: "Seconds",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#555",
                  }}
                />
                <Tooltip contentStyle={{ backgroundColor: "#f9fafb", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="duration" fill="#10B981" name="Duration (sec)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FocusTimer;
