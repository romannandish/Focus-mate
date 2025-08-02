import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X } from "lucide-react";

function Navbar() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = isLoggedIn ? (
    <>
      <Link
        to="/dashboard"
        className="text-white hover:text-indigo-200 transition-colors duration-200 font-medium"
      >
        Dashboard
      </Link>
      <button
        onClick={handleLogout}
        className="text-white hover:text-red-300 transition-colors duration-200 font-medium"
      >
        Logout
      </button>
    </>
  ) : (
    <>
      <Link
        to="/login"
        className="text-white hover:text-indigo-200 transition-colors duration-200 font-medium"
      >
        Login
      </Link>
      <Link
        to="/register"
        className="text-white hover:text-indigo-200 transition-colors duration-200 font-medium"
      >
        Register
      </Link>
    </>
  );

  return (
    <nav className="bg-gradient-to-r from-[#1f2937] via-[#312e81] to-[#1e3a8a] text-white shadow-xl sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
    <Link
      to="/"
      className="text-3xl font-bold tracking-tight hover:text-indigo-200 transition duration-300"
    >
      📘 SmartEdu
    </Link>

    {/* Desktop nav */}
    <div className="hidden md:flex space-x-10 text-lg items-center">
      {isLoggedIn ? (
        <>
          <Link
            to="/dashboard"
            className="text-white hover:text-indigo-300 transition-colors duration-200 font-medium"
          >
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="text-white hover:text-red-400 transition-colors duration-200 font-medium"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link
            to="/login"
            className="text-white hover:text-indigo-300 transition-colors duration-200 font-medium"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="text-white hover:text-indigo-300 transition-colors duration-200 font-medium"
          >
            Register
          </Link>
        </>
      )}
    </div>

    {/* Mobile menu toggle */}
    <div className="md:hidden">
      <button
        onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
        className="text-white focus:outline-none"
      >
        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>
    </div>
  </div>

  {/* Mobile nav */}
  {isMobileMenuOpen && (
    <div className="md:hidden px-6 pb-6 pt-2 space-y-4 text-base bg-gradient-to-b from-[#1f2937] via-[#312e81] to-[#1e3a8a] rounded-b-xl shadow-inner">
      {React.Children.map(
        isLoggedIn ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ),
        (child) =>
          React.cloneElement(child, {
            className: `${child.props.className} block py-1 text-lg hover:text-indigo-200`,
            onClick: () => setMobileMenuOpen(false),
          })
      )}
    </div>
  )}
</nav>

  );
}

export default Navbar;