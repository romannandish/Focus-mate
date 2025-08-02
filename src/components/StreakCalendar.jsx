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
    <section className="bg-gradient-to-br from-white via-slate-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <header className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">🔥 30-Day Focus Streak</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Track your consistency with visual focus history</p>
      </header>

      <div className="grid grid-cols-7 gap-3 text-center text-sm">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="font-semibold text-gray-500 dark:text-gray-400">{d}</div>
        ))}

        {past30Days.map(({ date, key, isFocused }) => (
          <div
            key={key}
            title={format(date, "MMM d")}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all
              ${isFocused
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600"}`}
          >
            {format(date, "d")}
          </div>
        ))}
      </div>
    </section>
  );
};

export default StreakCalendar;
