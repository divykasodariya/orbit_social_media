
// 2. IMPROVED HomePage.jsx - Better Login Guard UX
// ============================================
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getAllVideos } from "../api/video.api";
import VideoCard from "../components/video/VideoCard";
import CoWatchVideosBanner from "../components/cowatch/CoWatchVideosBanner";
import { useAuth } from "../context/AuthContext";
import { Lock } from "lucide-react";

const VideosPage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const query = searchParams.get("query") || "";

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await getAllVideos(query);
        const docs = res?.data?.data?.docs;

        if (Array.isArray(docs)) {
          setVideos(docs);
        } else {
          console.warn("Unexpected videos response:", res?.data);
          setVideos([]);
        }
      } catch (err) {
        console.error("Failed to load videos", err);
        setError("Failed to load videos");
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [query]);

  if (loading) {
    return (
      <div className="text-center mt-10 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Loading videos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-10 text-red-600 animate-[fadeIn_0.3s_ease-out]">
        {error}
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      {query && (
        <h2
          className="text-lg font-semibold mb-4
          animate-[slideUp_0.35s_ease-out]"
        >
          Search results for "{query}"
        </h2>
      )}

      {/* Co-Watch Room Option on /videos page */}
      {isAuthenticated && <CoWatchVideosBanner />}

      {/* ✅ SHOW LOGIN BANNER IF NOT AUTHENTICATED */}
      {!isAuthenticated && (
        <div
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6
          flex items-center justify-between animate-[fadeIn_0.3s_ease-out]"
        >
          <div className="flex items-center gap-3">
            <Lock className="text-blue-600" size={20} />
            <p className="text-blue-800">
              <strong>Sign in to watch videos</strong> and unlock full features
            </p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg
            transition hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      )}

      {videos.length === 0 ? (
        <p className="text-gray-500 text-center animate-[fadeIn_0.3s_ease-out]">
          No videos available
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video, index) => (
            <div
              key={video._id}
              style={{ animationDelay: `${index * 0.04}s` }}
              className="relative animate-[cardIn_0.4s_ease-out]"
            >
              {/* VIDEO CARD */}
              <VideoCard video={video} />

              {/* ✅ BETTER LOGIN GUARD - SEMI-TRANSPARENT OVERLAY */}
              {!isAuthenticated && (
                <div
                  onClick={() => navigate("/login")}
                  className="absolute inset-0 z-10 cursor-pointer
                  bg-black/40 rounded-xl backdrop-blur-[2px]
                  flex items-center justify-center
                  opacity-0 hover:opacity-100 transition-opacity duration-200
                  group"
                >
                  <div
                    className="bg-white px-4 py-2 rounded-lg
                    flex items-center gap-2 transform scale-90
                    group-hover:scale-100 transition-transform"
                  >
                    <Lock size={16} />
                    <span className="font-semibold">Sign in to watch</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideosPage;