import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import FocusTimerPage from "./pages/FocusTimer";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import FocusPage from "./pages/FocusPage";
import Analytics from "./pages/Analytics"; // ✅ ADD THIS
import JournalPage from "./pages/JournalPage";
import AIAssistantPage from "./pages/AIAssistantPage"; // ✅ ADD THIS

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="text-center mt-10">Loading...</div>;
  return isLoggedIn ? children : <Navigate to="/login" />;
}

function App() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  return (
    <>
      <Navbar />
      <Routes>
        {/* Auth routes */}
        <Route
          path="/login"
          element={!isLoggedIn ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/focus"
          element={
            <ProtectedRoute>
              <FocusTimerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/focuspage"
          element={
            <ProtectedRoute>
              <FocusPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        {/* Redirects */}
        <Route
          path="/"
          element={
            location.pathname === "/" ? (
              <Navigate to={isLoggedIn ? "/dashboard" : "/login"} />
            ) : null
          }
        />

        <Route
          path="/journal"
          element={
            <ProtectedRoute>
              <JournalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <ProtectedRoute>
              <AIAssistantPage />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;
