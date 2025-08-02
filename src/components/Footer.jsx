import React from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaGithub } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-gray-200 px-6 py-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10">
        {/* Brand Info */}
        <div>
          <h1 className="text-2xl font-bold mb-2">📘 SmartEdu</h1>
          <p className="text-sm text-gray-400">
            Empowering learning through smart focus tools and intelligent insights.
          </p>
        </div>

        {/* Navigation Links */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Quick Links</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="hover:text-white transition-colors duration-200">
                Home
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-white transition-colors duration-200">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors duration-200">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-colors duration-200">
                About
              </Link>
            </li>
          </ul>
        </div>

        {/* Social Media Icons */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Follow Us</h2>
          <div className="flex space-x-4 text-lg">
            <a href="#" className="hover:text-white transition-colors duration-200">
              <FaFacebookF />
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200">
              <FaTwitter />
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200">
              <FaLinkedinIn />
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200">
              <FaGithub />
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="text-center text-sm text-gray-400 mt-10 border-t border-indigo-700 pt-6">
        © 2025 SmartEdu. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
