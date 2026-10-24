// ============================================
// FIXED AuthContext.jsx - Register Now Saves Tokens
// ============================================

import { createContext, useContext, useEffect, useState, useRef } from "react";
import * as userApi from "../api/user.api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ Prevent multiple fetch calls
  const hasFetched = useRef(false);

  /* ================= FETCH CURRENT USER ================= */
  const fetchCurrentUser = async () => {
    console.log("🔍 Fetching current user...");
    
    try {
      const res = await userApi.getCurrentUser();
      console.log("✅ User authenticated:", res.data.data.username);
      setUser(res.data.data);
      return true;
    } catch (err) {
      // 401 is expected if not logged in
      if (err.response?.status === 401) {
        console.log("ℹ️ User not authenticated (401)");
      } else {
        console.error("❌ Auth error:", err.message);
      }
      setUser(null);
      return false;
    } finally {
      setLoading(false);
      console.log("✅ Auth check complete");
    }
  };

  /* ================= LOGIN ================= */
  const login = async (credentials) => {
    try {
      const res = await userApi.login(credentials);

      // ✅ Save tokens to localStorage as fallback
      if (res.data.data?.accessToken) {
        localStorage.setItem("accessToken", res.data.data.accessToken);
      }
      if (res.data.data?.refreshToken) {
        localStorage.setItem("refreshToken", res.data.data.refreshToken);
      }

      setUser(res.data.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Login failed",
      };
    }
  };

  /* ================= REGISTER - FIXED ================= */
  const register = async (formData) => {
    try {
      const res = await userApi.register(formData);
      
      // ✅ FIX: Save tokens to localStorage (same as login)
      if (res.data.data?.accessToken) {
        localStorage.setItem("accessToken", res.data.data.accessToken);
        console.log("✅ Saved accessToken to localStorage");
      }
      if (res.data.data?.refreshToken) {
        localStorage.setItem("refreshToken", res.data.data.refreshToken);
        console.log("✅ Saved refreshToken to localStorage");
      }
      
      // Set user data
      setUser(res.data.data.user);
      console.log("✅ User registered and authenticated:", res.data.data.user.username);
      
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Registration failed",
      };
    }
  };

  /* ================= LOGOUT ================= */
  const logout = async () => {
    try {
      await userApi.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // ✅ Clear localStorage
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    }
  };

  /* ================= INIT - ONLY ONCE ================= */
  useEffect(() => {
    // ✅ Prevent multiple calls
    if (hasFetched.current) return;
    
    hasFetched.current = true;
    fetchCurrentUser();
  }, []); // ✅ Empty dependency array - runs ONCE

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refetchUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);