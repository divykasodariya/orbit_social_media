import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Video, Upload as UploadIcon } from "lucide-react";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    avatar: null,
    coverImage: null,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = new FormData();
      data.append("fullName", formData.fullName);
      data.append("username", formData.username);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("avatar", formData.avatar);
      if (formData.coverImage) {
        data.append("coverImage", formData.coverImage);
      }

      const result = await register(data);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.message || "Registration failed");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-white
      flex items-center justify-center p-4
      animate-[fadeIn_0.35s_ease-out]"
    >
      <div className="w-full max-w-2xl animate-[slideUp_0.4s_ease-out]">
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600
              rounded-xl flex items-center justify-center
              transition-transform duration-300 hover:scale-105"
            >
              <Video className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold">Orbit</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600">Join Orbit today</p>
        </div>

        {/* CARD */}
        <div
          className="bg-white rounded-2xl shadow-xl p-8
          animate-[cardIn_0.4s_ease-out]"
        >
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-600
              px-4 py-3 rounded-lg text-sm mb-4
              animate-[fadeIn_0.2s_ease-out]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* FULL NAME & USERNAME */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300
                  rounded-lg focus:outline-none focus:ring-2
                  focus:ring-blue-500 transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300
                  rounded-lg focus:outline-none focus:ring-2
                  focus:ring-blue-500 transition-all"
                  placeholder="johndoe"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300
                rounded-lg focus:outline-none focus:ring-2
                focus:ring-blue-500 transition-all"
                placeholder="john@example.com"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300
                rounded-lg focus:outline-none focus:ring-2
                focus:ring-blue-500 transition-all"
                placeholder="Create a strong password"
              />
            </div>

            {/* AVATAR & COVER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, avatar: e.target.files[0] })
                  }
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="flex items-center justify-center gap-2
                  w-full px-4 py-3 border-2 border-dashed
                  border-gray-300 rounded-lg cursor-pointer
                  hover:border-blue-500 transition-colors"
                >
                  <UploadIcon className="w-5 h-5" />
                  <span className="text-sm">
                    {formData.avatar
                      ? formData.avatar.name
                      : "Upload Avatar"}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coverImage: e.target.files[0],
                    })
                  }
                  className="hidden"
                  id="cover-upload"
                />
                <label
                  htmlFor="cover-upload"
                  className="flex items-center justify-center gap-2
                  w-full px-4 py-3 border-2 border-dashed
                  border-gray-300 rounded-lg cursor-pointer
                  hover:border-blue-500 transition-colors"
                >
                  <UploadIcon className="w-5 h-5" />
                  <span className="text-sm">
                    {formData.coverImage
                      ? formData.coverImage.name
                      : "Upload Cover"}
                  </span>
                </label>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3
              rounded-lg font-semibold
              transition-all duration-200
              hover:bg-blue-700 active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:underline font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
