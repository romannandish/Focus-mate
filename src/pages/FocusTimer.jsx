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
        duration: Math.round(
          (new Date(s.endTime) - new Date(s.startTime)) / 1000 // in seconds
        ),
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
      const durationInSec = Math.round(
        (new Date(session.endTime) - new Date(session.startTime)) / 1000
      );
      setLastSession({ ...session, duration: durationInSec });
    } catch (err) {
      console.error("Failed to fetch last session", err);
    }
  };

 const fetchTodayTotal = async () => {
  try {
    const res = await axios.get("http://localhost:5000/api/focus/today");
    const totalSeconds = res.data.totalSeconds; // This is already in seconds
    console.log(totalSeconds);
    setTotalToday(Math.round(totalSeconds)); // ✅ No need to multiply by 60
  } catch (err) {
    console.error("Failed to fetch today's total", err);
  }
};

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-2xl text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">📈 Focus Stats</h1>

      {/* Streak, Last Session, and Today's Total */}
      <div className="mb-10 text-left px-4">
        <h2 className="text-xl font-bold text-gray-700 mb-2">🔥 Current Streak</h2>
        <p className="text-blue-700 font-semibold text-lg mb-4">
          {streak} day{streak !== 1 && "s"} in a row
        </p>

        {lastSession && (
          <>
            <h2 className="text-xl font-bold text-gray-700 mb-2">🕒 Last Session</h2>
            <p className="text-sm text-gray-600">
              Start: {new Date(lastSession.startTime).toLocaleTimeString()}<br />
              End: {new Date(lastSession.endTime).toLocaleTimeString()}<br />
              Duration:{" "}
              <span className="font-semibold">
                {lastSession.duration} sec
              </span>
            </p>
          </>
        )}

        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-700 mb-2">📆 Total Focus Time Today</h2>
          <p className="text-green-600 font-semibold text-lg">
            {totalToday} second{totalToday !== 1 && "s"}
          </p>
        </div>
      </div>

      {/* Session Duration Chart */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-3 text-gray-800">📊 Last 7 Sessions (Duration)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sessionBarData}>
            <XAxis dataKey="sessionNumber" />
            <YAxis
              label={{ value: "Seconds", angle: -90, position: "insideLeft" }}
            />
            <Tooltip />
            <Legend />
            <Bar dataKey="duration" fill="#10B981" name="Duration (sec)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FocusTimer;
