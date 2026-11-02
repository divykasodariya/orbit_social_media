import { useState, useEffect } from "react";
import { Camera, UserPlus, UserCheck, Clock, Bell, Settings, LogOut, Lock, MessageCircle } from "lucide-react";
import { sendFriendRequest } from "../../api/friend.api";
import { toggleSubscription } from "../../api/subscription.api";
import { getInitials, formatSubscribers } from "../../utils/helpers";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ProfileHeader = ({
  profileUser,
  stats,
  isOwnProfile,
  onEditProfile,
  onEditAvatar,
  onEditCover,
  onChangePassword,
  onLogout,
  onOpenChat,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [friendStatus, setFriendStatus] = useState("none"); // none | pending | friends
  const [friendLoading, setFriendLoading] = useState(false);

  const [isSubscribed, setIsSubscribed] = useState(Boolean(profileUser?.isSubscribed));
  const [subscribersCount, setSubscribersCount] = useState(profileUser?.subscribersCount || 0);
  const [subLoading, setSubLoading] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  useEffect(() => {
    setIsSubscribed(Boolean(profileUser?.isSubscribed));
    setSubscribersCount(profileUser?.subscribersCount || 0);
  }, [profileUser]);

  const handleSendFriendRequest = async () => {
    if (!isAuthenticated) return navigate("/login");
    try {
      setFriendLoading(true);
      await sendFriendRequest(profileUser._id);
      setFriendStatus("pending");
    } catch (err) {
      console.error("Failed to send friend request", err);
    } finally {
      setFriendLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) return navigate("/login");
    if (subLoading) return;

    try {
      setSubLoading(true);
      const res = await toggleSubscription(profileUser._id);
      const subscribed = res.data?.data?.isSubscribed;
      setIsSubscribed(Boolean(subscribed));
      setSubscribersCount((prev) => (subscribed ? prev + 1 : Math.max(0, prev - 1)));
    } catch (err) {
      console.error("Subscribe toggle failed", err);
    } finally {
      setSubLoading(false);
    }
  };

  if (!profileUser) return null;

  const initials = getInitials(profileUser.fullName || profileUser.username);

  return (
    <div className="animate-[cardIn_0.35s_ease-out]">
      {/* COVER IMAGE */}
      <div className="relative h-48 md:h-56 rounded-2xl overflow-hidden bg-slate-100 border border-gray-200">
        {profileUser.coverImage ? (
          <img
            src={profileUser.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-100 via-gray-100 to-slate-200 flex items-center justify-center text-slate-400">
            <span className="text-sm font-medium tracking-wide text-gray-400 select-none">
              {profileUser.fullName || profileUser.username}
            </span>
          </div>
        )}

        {isOwnProfile && (
          <button
            onClick={onEditCover}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition shadow-md backdrop-blur-xs"
            title="Change cover image"
          >
            <Camera size={18} />
          </button>
        )}
      </div>

      {/* WHITE CARD */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs px-6 pb-6 -mt-8 relative mx-2 md:mx-4">
        {/* AVATAR + ACTIONS ROW */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="relative -mt-14 self-start sm:self-auto">
            {profileUser.avatar ? (
              <img
                src={profileUser.avatar}
                alt={profileUser.fullName || profileUser.username}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md bg-white"
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}

            {/* Monogram Fallback */}
            <div
              style={{ display: profileUser.avatar ? "none" : "flex" }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-md bg-slate-100 text-slate-700 font-bold text-3xl items-center justify-center select-none uppercase tracking-wide"
            >
              {initials}
            </div>

            {isOwnProfile && (
              <button
                onClick={onEditAvatar}
                className="absolute bottom-1 right-1 bg-slate-800 hover:bg-black text-white p-2 rounded-full transition shadow-md"
                title="Change profile picture"
              >
                <Camera size={14} />
              </button>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-2 sm:pt-4 flex items-center gap-2.5 flex-wrap">
            {isOwnProfile ? (
              <>
                <button
                  onClick={onEditProfile}
                  className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold px-4 py-2 rounded-xl text-sm shadow-2xs transition active:scale-[0.98]"
                >
                  Edit Profile
                </button>

                <button
                  onClick={onOpenChat}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold px-3.5 py-2 rounded-xl text-sm shadow-2xs transition active:scale-[0.98]"
                  title="Your Chats & Messages"
                >
                  <MessageCircle size={15} className="text-blue-600" />
                  <span>Messages</span>
                </button>

                {/* Settings dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsMenu((p) => !p)}
                    className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 px-3 py-2 rounded-xl text-sm font-semibold transition shadow-2xs"
                    title="Account Settings"
                  >
                    <Settings size={16} />
                    <span className="hidden sm:inline">Settings</span>
                  </button>

                  {showSettingsMenu && (
                    <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-30 w-48 py-1.5 origin-top-right animate-[dropdown_0.15s_ease-out]">
                      <button
                        onClick={() => {
                          setShowSettingsMenu(false);
                          onChangePassword();
                        }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Lock size={15} className="text-gray-500" />
                        Change Password
                      </button>
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={() => {
                          setShowSettingsMenu(false);
                          onLogout();
                        }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut size={15} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Subscribe Button */}
                <button
                  disabled={subLoading}
                  onClick={handleSubscribe}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all active:scale-[0.98] ${
                    isSubscribed
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
                      : "bg-gray-900 hover:bg-black text-white shadow-xs"
                  }`}
                >
                  <Bell size={15} />
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </button>

                {/* Direct Message Button */}
                <button
                  onClick={onOpenChat}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold px-3.5 py-2 rounded-xl text-sm shadow-2xs transition active:scale-[0.98]"
                  title={`Chat with ${profileUser.fullName || profileUser.username}`}
                >
                  <MessageCircle size={15} className="text-blue-600" />
                  <span>Message</span>
                </button>

                {/* Add Friend Button */}
                {friendStatus === "none" && (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={friendLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 shadow-xs"
                  >
                    <UserPlus size={15} />
                    {friendLoading ? "Sending..." : "Add Friend"}
                  </button>
                )}
                {friendStatus === "pending" && (
                  <button
                    disabled
                    className="flex items-center gap-2 bg-gray-100 text-gray-500 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    <Clock size={15} />
                    Request Sent
                  </button>
                )}
                {friendStatus === "friends" && (
                  <button
                    disabled
                    className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    <UserCheck size={15} />
                    Friends
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* USER INFO */}
        <div className="mt-3.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {profileUser.fullName || profileUser.username}
            </h1>
            <span className="text-sm text-gray-500 font-medium">@{profileUser.username}</span>
          </div>

          {subscribersCount > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatSubscribers(subscribersCount)} subscribers
            </p>
          )}

          {isOwnProfile && profileUser.email && (
            <p className="text-xs text-gray-500 mt-1">{profileUser.email}</p>
          )}
        </div>

        {/* STATS ROW (Professional light gray badges) */}
        {stats && (
          <div className="flex flex-wrap gap-2.5 mt-5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-center min-w-[85px]">
              <p className="text-lg font-bold text-gray-900">
                {stats.videoCount ?? 0}
              </p>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Videos
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-center min-w-[85px]">
              <p className="text-lg font-bold text-gray-900">
                {stats.postCount ?? (stats.tweetCount ?? 0) + (stats.threadCount ?? 0)}
              </p>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Posts
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-center min-w-[85px]">
              <p className="text-lg font-bold text-gray-900">
                {stats.friendCount ?? 0}
              </p>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Friends
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-center min-w-[85px]">
              <p className="text-lg font-bold text-gray-900">
                {stats.communityCount ?? 0}
              </p>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Communities
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
