import React, { useState, useEffect } from "react";
import axios from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Add this import

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
    // branch and semester removed
  });

  const navigate = useNavigate();
  const { isLoggedIn } = useAuth(); // Use AuthContext

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/dashboard"); // Redirect to dashboard if logged in
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
    <form
      onSubmit={handleRegister}
      className="bg-white p-6 rounded-xl shadow-md space-y-4 w-96 mx-auto mt-20"
    >
      <h2 className="text-2xl font-bold text-center">Register</h2>
      <input
        type="text"
        name="username"
        placeholder="Username"
        className="w-full p-2 border rounded"
        value={formData.username}
        onChange={handleChange}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        className="w-full p-2 border rounded"
        value={formData.email}
        onChange={handleChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        className="w-full p-2 border rounded"
        value={formData.password}
        onChange={handleChange}
      />
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Register
      </button>
    </form>
  );
}

export default Register;