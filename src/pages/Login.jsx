// src/pages/Login.jsx
import React, { useState } from "react";
import axios from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, User } from "lucide-react";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/login", { username, password });
      login(res.data.token);
      alert("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-zinc-900 dark:to-gray-800 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-6 border dark:border-zinc-700"
      >
        <h2 className="text-3xl font-extrabold text-center text-gray-800 dark:text-white">
          Welcome Back
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          Login to access your dashboard
        </p>

        <div className="space-y-4">
          <div className="flex items-center border dark:border-zinc-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-zinc-800">
            <span className="px-3 text-gray-400">
              <User size={18} />
            </span>
            <input
              type="text"
              placeholder="Username"
              className="w-full px-3 py-2 bg-transparent outline-none text-gray-800 dark:text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="flex items-center border dark:border-zinc-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-zinc-800">
            <span className="px-3 text-gray-400">
              <Lock size={18} />
            </span>
            <input
              type="password"
              placeholder="Password"
              className="w-full px-3 py-2 bg-transparent outline-none text-gray-800 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
        >
          Login
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <span
            className="text-green-600 hover:underline cursor-pointer"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </form>
    </main>
  );
}

export default Login;
