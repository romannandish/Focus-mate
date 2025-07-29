// src/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to the Dashboard</h1>

      <div className="mb-4 space-y-2 md:space-y-0 md:space-x-4">
        <button
          onClick={() => navigate("/focus")}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Go to Focus Timer
        </button>

        <button
          onClick={() => navigate("/focuspage")}
          className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
        >
          Go to Focus Page
        </button>

        <button
          onClick={() => navigate("/analytics")}
          className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
        >
          View Analytics
        </button>

        <button
          onClick={() => navigate("/ai-assistant")}
          className="bg-indigo-500 text-white py-2 px-4 rounded hover:bg-indigo-600"
        >
          Open AI Assistant
        </button>

        <button
          onClick={() => navigate("/journal")}
          className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600"
        >
          Go to Journal
        </button>
      </div>

      <button
        onClick={logout}
        className="mt-4 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
