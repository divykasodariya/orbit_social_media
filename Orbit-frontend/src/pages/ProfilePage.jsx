import { useEffect, useState } from "react";
import { Camera, Save, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  updateAccountDetails,
  changePassword,
  updateUserAvatar,
  updateCoverImage,
} from "../api/user.api";

const ProfilePage = () => {
  const { user, refetchUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [coverKey, setCoverKey] = useState(Date.now());

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleAccountUpdate = async () => {
    try {
      setLoading(true);
      await updateAccountDetails({ fullName, email });
      await refetchUser();
      alert("Profile updated successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
      return alert("Both passwords are required");
    }

    if (oldPassword === newPassword) {
      return alert("New password cannot be same as old password");
    }

    try {
      setLoading(true);
      await changePassword({ oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      alert("Password updated successfully");
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 400 || status === 401) {
        alert(message || "Wrong old password");
      } else {
        alert("Password update failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setLoading(true);
      await updateUserAvatar(formData);
      await refetchUser();
      setAvatarKey(Date.now());
      alert("Avatar updated successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Avatar update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCoverChange = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("coverImage", file);

    try {
      setLoading(true);
      await updateCoverImage(formData);
      await refetchUser();
      setCoverKey(Date.now());
      alert("Cover image updated successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Cover update failed");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto animate-[fadeIn_0.35s_ease-out]">
      {/* COVER */}
      <div className="relative h-48 rounded-xl mb-16 overflow-hidden bg-gray-200 animate-[cardIn_0.4s_ease-out]">
        {user.coverImage && (
          <img
            src={`${user.coverImage}?t=${coverKey}`}
            className="w-full h-full object-cover"
            alt="cover"
          />
        )}

        <label className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full cursor-pointer transition hover:scale-105">
          <Camera size={18} />
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => handleCoverChange(e.target.files[0])}
          />
        </label>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white rounded-xl p-6 -mt-20 shadow animate-[slideUp_0.35s_ease-out]">
        <div className="flex gap-6 items-center">
          <div className="relative">
            <img
              src={`${user.avatar}?t=${avatarKey}`}
              alt="avatar"
              className="w-32 h-32 rounded-full object-cover bg-gray-300 transition-transform hover:scale-105"
            />
            <label className="absolute bottom-2 right-2 bg-blue-600 text-white p-2 rounded-full cursor-pointer transition hover:scale-105">
              <Camera size={16} />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => handleAvatarChange(e.target.files[0])}
              />
            </label>
          </div>

          <div>
            <h1 className="text-2xl font-bold">{user.fullName}</h1>
            <p className="text-gray-500">@{user.username}</p>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
      </div>

      {/* SETTINGS */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* ACCOUNT */}
        <div className="bg-white p-6 rounded-xl shadow animate-[cardIn_0.35s_ease-out]">
          <h2 className="font-semibold mb-4">Account Details</h2>

          <input
            className="w-full border px-4 py-2 rounded mb-3"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full Name"
          />

          <input
            className="w-full border px-4 py-2 rounded mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />

          <button
            disabled={loading}
            onClick={handleAccountUpdate}
            className="flex gap-2 bg-blue-600 text-white px-5 py-2 rounded
            transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Save size={18} /> Save
          </button>
        </div>

        {/* PASSWORD */}
        <div className="bg-white p-6 rounded-xl shadow animate-[cardIn_0.35s_ease-out]">
          <h2 className="font-semibold mb-4">Change Password</h2>

          <input
            type="password"
            className="w-full border px-4 py-2 rounded mb-3"
            placeholder="Old Password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />

          <input
            type="password"
            className="w-full border px-4 py-2 rounded mb-4"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <button
            disabled={loading}
            onClick={handlePasswordChange}
            className="flex gap-2 bg-gray-900 text-white px-5 py-2 rounded
            transition hover:bg-black active:scale-[0.98]"
          >
            <Lock size={18} /> Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;