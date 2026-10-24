// ============================================
// FIXED App.jsx - Proper Route Structure
// ============================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { CoWatchProvider } from "./context/CoWatchContext";

// Pages
import HomePage from "./pages/HomePage";
import VideosPage from "./pages/VideosPage";
import CommunitiesPage from "./pages/CommunitiesPage";
import FriendsPage from "./pages/FriendsPage";
import ExplorePage from "./pages/ExplorePage";
import SearchPage from "./pages/SearchPage";
import NotificationsPage from "./pages/NotificationsPage";
import WatchPage from "./pages/WatchPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import ChannelPage from "./pages/ChannelPage";
import UploadPage from "./pages/UploadPage";
import DashboardPage from "./pages/DashboardPage";
import UserVideosPage from "./pages/UserVideosPage";
import TweetsPage from "./pages/TweetsPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import HistoryPage from "./pages/HistoryPage";
import PlaylistDetailsPage from "./pages/PlaylistDetailsPage";
import LikedVideosPage from "./pages/LikedVideosPage";
import PlaylistsPage from "./pages/PlaylistsPage";

// ✅ Wrapper to prevent logged-in users from seeing login/register
function AuthRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // ✅ If already logged in, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <CoWatchProvider>
        <Routes>
          {/* ================= AUTH ROUTES ================= */}
          <Route
            path="/login"
            element={
              <AuthRoute>
                <LoginPage />
              </AuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <AuthRoute>
                <RegisterPage />
              </AuthRoute>
            }
          />

          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/video" element={<Navigate to="/videos" replace />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/watch/:videoId" element={<WatchPage />} />
            <Route path="/channel/:username" element={<ChannelPage />} />
            <Route path="/tweets" element={<TweetsPage />} />
          </Route>

        {/* ================= PROTECTED ROUTES ================= */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/liked-videos" element={<LikedVideosPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlists/:playlistId" element={<PlaylistDetailsPage />} />
            <Route path="/studio/dashboard" element={<DashboardPage />} />
            <Route path="/studio/videos" element={<UserVideosPage />} />
          </Route>
        </Route>

        {/* ================= 404 CATCH-ALL ================= */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </CoWatchProvider>
    </BrowserRouter>
  );
}

export default App;