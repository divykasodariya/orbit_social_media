import { useState } from "react";
import {
  loginUser,
  logoutUser,
  getCurrentUser
} from "../api/auth.api";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (data) => {
    setLoading(true);
    try {
      const res = await loginUser(data);
      setUser(res.data.data.user);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await getCurrentUser();
      setUser(res.data.data);
    } catch {
      setUser(null);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    fetchCurrentUser
  };
};
