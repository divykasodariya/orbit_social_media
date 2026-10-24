// ============================================
// FIXED ProtectedRoute.jsx - No Infinite Redirects
// ============================================

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // ✅ Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // ✅ Redirect to login if not authenticated
  // Save current location so we can redirect back after login
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ from: location }} 
      />
    );
  }

  // ✅ User is authenticated, render protected content
  return <Outlet />;
};

export default ProtectedRoute;