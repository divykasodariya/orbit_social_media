// ============================================
// FIXED LoginPage.jsx - No Infinite Renders
// ============================================

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Video } from "lucide-react";
import logo from "../assets/Logo.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading } = useAuth();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ✅ Redirect if already logged in (runs once when auth state changes)
  // MOVED OUTSIDE of render to prevent loops
  if (isAuthenticated && !loading) {
    const from = location.state?.from?.pathname || "/";
    navigate(from, { replace: true });
    return null; // Prevent rendering during redirect
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Detect if input is email or username
      const isEmail = formData.identifier.includes("@");
      
      const credentials = isEmail
        ? { email: formData.identifier, password: formData.password }
        : { username: formData.identifier, password: formData.password };

      const res = await login(credentials);
      
      if (res.success) {
        // ✅ Navigate will happen automatically via the check above
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      } else {
        setError(res.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center
      bg-gradient-to-br from-blue-50 to-white px-4
      animate-[fadeIn_0.35s_ease-out]"
    >
      <div className="w-full max-w-md animate-[slideUp_0.4s_ease-out]">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4 transition-transform duration-200 hover:scale-105">
            <img src={logo} alt="Orbit" className="h-12 w-auto object-contain" />
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        <div
          className="bg-white rounded-2xl shadow-xl p-8
          animate-[cardIn_0.4s_ease-out]"
        >
          {error && (
            <div
              className="mb-4 text-sm text-red-600 bg-red-50
              border border-red-200 rounded-lg px-4 py-2
              animate-[fadeIn_0.2s_ease-out]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">
                Email or Username
              </label>
              <input
                required
                value={formData.identifier}
                onChange={(e) =>
                  setFormData({ ...formData, identifier: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg
                focus:ring-2 focus:ring-blue-500 outline-none
                transition-all"
                placeholder="Enter email or username"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                required
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg
                focus:ring-2 focus:ring-blue-500 outline-none
                transition-all"
                placeholder="Enter password"
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3
              rounded-lg font-semibold
              transition-all duration-200
              hover:bg-blue-700 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-600 font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;