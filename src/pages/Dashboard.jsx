import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 sm:p-12 space-y-12 transition-all duration-300">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white">🎯 Dashboard</h1>
          <p className="text-lg text-gray-500 dark:text-gray-300">Your personal productivity hub</p>
        </header>

        {/* Focus Mode CTA */}
        <section className="text-center">
          <button
            onClick={() => navigate("/focuspage")}
            className="w-full max-w-md mx-auto bg-purple-600 text-white text-lg font-medium py-4 rounded-2xl shadow-xl hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-500 transition"
          >
            🚀 Enter Focus Mode
          </button>
        </section>

        {/* Navigation Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">🔗 Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <button
              onClick={() => navigate("/focus")}
              className="bg-sky-500 text-white py-3 px-4 rounded-xl shadow-md hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-600 transition"
            >
              ⏱️ Focus Timer
            </button>
            <button
              onClick={() => navigate("/analytics")}
              className="bg-green-500 text-white py-3 px-4 rounded-xl shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-600 transition"
            >
              📊 View Analytics
            </button>
            <button
              onClick={() => navigate("/ai-assistant")}
              className="bg-indigo-500 text-white py-3 px-4 rounded-xl shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 transition"
            >
              🤖 AI Assistant
            </button>
            <button
              onClick={() => navigate("/journal")}
              className="bg-yellow-500 text-white py-3 px-4 rounded-xl shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-600 transition"
            >
              📓 Journal
            </button>
          </div>
        </section>

        {/* Logout */}
        <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={logout}
            className="bg-red-500 text-white px-6 py-3 mt-4 rounded-xl shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 transition"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
