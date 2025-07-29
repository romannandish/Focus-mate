// src/pages/Login.jsx
import React, { useState } from "react";
import axios from "../utils/api"; // or use axios directly
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/login", { username, password });
      login(res.data.token); // set context + localStorage
      alert("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.msg || "Login failed");
    }
  };

  return (
    <form
      onSubmit={handleLogin}
      className="bg-white p-6 rounded-xl shadow-md space-y-4 w-96 mx-auto mt-20"
    >
      <h2 className="text-2xl font-bold text-center">Login</h2>
      <input
        type="text"
        placeholder="Username"
        className="w-full p-2 border rounded"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 border rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type="submit"
        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
      >
        Login
      </button>
      <p className="text-center">
        Don't have an account?{" "}
        <span
          className="text-green-500 cursor-pointer"
          onClick={() => navigate("/register")}
        >
          Register
        </span>
      </p>
    </form>
  );
}

export default Login;
