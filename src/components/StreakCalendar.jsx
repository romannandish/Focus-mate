import React, { useEffect, useState } from "react";
import axios from "axios";
import { format, subDays, startOfToday } from "date-fns";

const StreakCalendar = () => {
  const [streakMap, setStreakMap] = useState({});

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/focus/streak-cal");
        setStreakMap(res.data);
      } catch (err) {
        console.error("Error fetching streak data:", err);
      }
    };
    fetchStreak();
  }, []);

  const today = startOfToday();
  const past30Days = Array.from({ length: 30 }).map((_, i) => {
    const date = subDays(today, 29 - i);
    const key = format(date, "yyyy-MM-dd");
    const isFocused = streakMap[key] === 1;
    return { date, key, isFocused };
  });

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-green-600 mb-4">🔥 30-Day Focus Streak</h3>
      <div className="grid grid-cols-7 gap-2 text-center text-sm">
        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
          <div key={d} className="font-semibold text-gray-500">{d}</div>
        ))}
        {past30Days.map(({ date, key, isFocused }) => (
          <div
            key={key}
            className={`w-8 h-8 rounded-md mx-auto border text-xs flex items-center justify-center
              ${isFocused ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}
            title={format(date, "MMM d")}
          >
            {format(date, "d")}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreakCalendar;
