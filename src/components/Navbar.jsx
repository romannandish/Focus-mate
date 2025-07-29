import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X } from "lucide-react"; // Optional icons, install with: npm i lucide-react

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
      <Link to="/dashboard" className="hover:text-indigo-400 transition">
        Dashboard
      </Link>
      <button onClick={handleLogout} className="hover:text-red-400 transition">
        Logout
      </button>
    </>
  ) : (
    <>
      <Link to="/login" className="hover:text-indigo-400 transition">
        Login
      </Link>
      <Link to="/register" className="hover:text-indigo-400 transition">
        Register
      </Link>
    </>
  );

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          Education App
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex space-x-6 text-lg">
          {navLinks}
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden">
          <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} className="focus:outline-none">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 pb-4 space-y-3 text-lg">
          {React.Children.map(navLinks, (child) =>
            React.cloneElement(child, {
              className: `${child.props.className} block`,
              onClick: () => setMobileMenuOpen(false),
            })
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
