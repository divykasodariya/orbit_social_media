import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getLikedVideos } from "../api/like.api";
import VideoCard from "../components/video/VideoCard";
import { Heart } from "lucide-react";

const LikedVideosPage = () => {
  const { isAuthenticated } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadLikedVideos = async () => {
      try {
        const res = await getLikedVideos();
        const data = Array.isArray(res.data.data)
          ? res.data.data
          : [];

        const normalized = data.map((item) => ({
          ...item.video,
          channel: item.channel,
          likedAt: item.likedAt,
        }));

        setVideos(normalized);
      } catch (err) {
        console.error("Failed to load liked videos", err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    loadLikedVideos();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="text-center mt-16 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Login to see liked videos
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center mt-10 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Loading liked videos...
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      <h1
        className="text-3xl font-bold mb-6 flex items-center gap-2
        animate-[slideUp_0.35s_ease-out]"
      >
        <Heart size={28} className="text-red-500" /> Liked Videos
      </h1>

      {videos.length === 0 ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          You haven’t liked any videos yet
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video, i) => (
            <div
              key={video._id}
              style={{ animationDelay: `${i * 0.04}s` }}
              className="animate-[cardIn_0.4s_ease-out]"
            >
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LikedVideosPage;
