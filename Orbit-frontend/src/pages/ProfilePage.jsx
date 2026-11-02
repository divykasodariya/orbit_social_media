import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getUserChannelProfile,
  getUserById,
  getUserStats,
  updateUserAvatar,
  updateCoverImage,
} from "../api/user.api";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileVideoTab from "../components/profile/ProfileVideoTab";
import ProfilePostsTab from "../components/profile/ProfilePostsTab";
import ProfileCommunitiesTab from "../components/profile/ProfileCommunitiesTab";
import ProfilePlaylistsTab from "../components/profile/ProfilePlaylistsTab";
import EditProfileModal from "../components/profile/EditProfileModal";
import ChangePasswordModal from "../components/profile/ChangePasswordModal";
import ProfileChatModal from "../components/profile/ProfileChatModal";
import Loader from "../components/common/Loader";

const TABS = ["Videos", "Posts", "Communities", "Playlists"];

const ProfilePage = () => {
  const { username, userId } = useParams();
  const { user: currentUser, loading: authLoading, refetchUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("Videos");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Check if profile belongs to logged-in user
  const isOwnProfile = Boolean(
    currentUser &&
      (!username && !userId
        ? true
        : (username && currentUser.username?.toLowerCase() === username.toLowerCase()) ||
          (userId && (currentUser._id === userId || currentUser._id?.toString() === userId)))
  );

  const loadProfile = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      let userData = null;

      if (!username && !userId) {
        // Own profile view (/profile or /channel)
        if (authLoading) return;
        if (!currentUser) {
          setLoading(false);
          setNotFound(true);
          return;
        }
        // Fetch fresh channel profile to get subscribersCount, etc.
        try {
          const res = await getUserChannelProfile(currentUser.username);
          userData = res.data?.data || currentUser;
        } catch {
          userData = currentUser;
        }
      } else if (username) {
        // Public/Channel profile by username (/channel/:username or /profile/:username)
        const res = await getUserChannelProfile(username);
        userData = res.data?.data;
      } else if (userId) {
        // Profile by ID (/u/:userId)
        try {
          const res = await getUserChannelProfile(userId);
          userData = res.data?.data;
        } catch {
          const res = await getUserById(userId);
          userData = res.data?.data;
        }
      }

      if (!userData || !userData._id) {
        setNotFound(true);
        setProfileUser(null);
        return;
      }

      setProfileUser(userData);

      // Fetch user stats
      try {
        const statsRes = await getUserStats(userData._id);
        setStats(statsRes.data?.data || null);
      } catch {
        setStats(null);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
      if (err.response?.status === 404 || err.response?.status === 400) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!username && !userId && authLoading) return;
    loadProfile();
  }, [username, userId, currentUser?._id, authLoading]);

  const handleAvatarChange = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await updateUserAvatar(formData);
      await refetchUser();
      await loadProfile();
    } catch (err) {
      console.error("Avatar update failed", err);
    }
  };

  const handleCoverChange = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("coverImage", file);
    try {
      await updateCoverImage(formData);
      await refetchUser();
      await loadProfile();
    } catch (err) {
      console.error("Cover update failed", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <Loader />
      </div>
    );
  }

  if (notFound || !profileUser) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center animate-[fadeIn_0.35s_ease-out]">
        <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center font-bold text-2xl mb-4">
          ?
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">User not found</h2>
        <p className="text-gray-500 max-w-sm mx-auto text-sm">
          The user profile you're looking for doesn't exist, has changed their username, or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-[fadeIn_0.35s_ease-out]">
      {/* Hidden file inputs for avatar/cover upload (own profile only) */}
      {isOwnProfile && (
        <>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarChange(e.target.files[0])}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleCoverChange(e.target.files[0])}
          />
        </>
      )}

      {/* Unified Profile Header */}
      <ProfileHeader
        profileUser={profileUser}
        stats={stats}
        isOwnProfile={isOwnProfile}
        onEditProfile={() => setShowEditModal(true)}
        onEditAvatar={() => avatarInputRef.current?.click()}
        onEditCover={() => coverInputRef.current?.click()}
        onChangePassword={() => setShowPasswordModal(true)}
        onLogout={handleLogout}
        onOpenChat={() => setShowChatModal(true)}
      />

      {/* Content Tabs (Videos, Posts, Communities, Playlists) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden mx-2 md:mx-4">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-3 md:px-6 overflow-x-auto custom-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3.5 text-sm font-semibold transition border-b-2 whitespace-nowrap -mb-px ${
                activeTab === tab
                  ? "text-blue-600 border-blue-600 bg-blue-50/50"
                  : "text-gray-500 hover:text-gray-800 border-transparent hover:border-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="p-4 sm:p-6 min-h-[300px]">
          {activeTab === "Videos" && (
            <ProfileVideoTab
              userId={profileUser._id}
              isOwnProfile={isOwnProfile}
            />
          )}

          {activeTab === "Posts" && (
            <ProfilePostsTab
              userId={profileUser._id}
              isOwnProfile={isOwnProfile}
            />
          )}

          {activeTab === "Communities" && (
            <ProfileCommunitiesTab
              userId={profileUser._id}
              isOwnProfile={isOwnProfile}
            />
          )}

          {activeTab === "Playlists" && (
            <ProfilePlaylistsTab
              userId={profileUser._id}
              isOwnProfile={isOwnProfile}
            />
          )}
        </div>
      </div>

      {/* Account Management Modals (Only rendered for own profile) */}
      {isOwnProfile && showEditModal && (
        <EditProfileModal
          user={profileUser}
          onClose={() => setShowEditModal(false)}
          onSave={async () => {
            await refetchUser();
            await loadProfile();
          }}
        />
      )}

      {isOwnProfile && showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* Chat / Message Modal */}
      {showChatModal && (
        <ProfileChatModal
          initialUser={isOwnProfile ? null : profileUser}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
