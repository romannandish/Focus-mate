import React, { useState, useEffect } from "react";
import axios from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });

  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard");
    }
  }, [isLoggedIn, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/register", formData);
      alert("Registration successful! You can now login.");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.msg || "Registration failed");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl space-y-6 transition-all"
      >
        <h2 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400">Create an Account</h2>

        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <input
            type="text"
            name="username"
            placeholder="e.g. johndoe"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
            value={formData.username}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <input
            type="password"
            name="password"
            placeholder="********"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Register
        </button>

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Already have an account? <a href="/login" className="text-blue-500 hover:underline">Login here</a>
        </p>
      </form>
    </main>
  );
}

export default Register;