import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getWatchHistory } from "../api/user.api";
import VideoCard from "../components/video/VideoCard";
import { Clock } from "lucide-react";

const HistoryPage = () => {
  const { isAuthenticated } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const res = await getWatchHistory();
        const data = Array.isArray(res.data.data) ? res.data.data : [];

        const normalized = data
          .map((item) => {
            if (item.video) {
              return {
                ...item.video,
                watchedAt: item.watchedAt,
              };
            }
            return item;
          })
          .sort(
            (a, b) =>
              new Date(b.watchedAt || b.updatedAt) -
              new Date(a.watchedAt || a.updatedAt)
          );

        setVideos(normalized);
      } catch (err) {
        console.error("Failed to load watch history", err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="text-center mt-16 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Login to see your watch history
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center mt-10 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Loading history...
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      <h1
        className="text-3xl font-bold mb-6 flex items-center gap-2
        animate-[slideUp_0.35s_ease-out]"
      >
        <Clock size={28} /> Watch History
      </h1>

      {videos.length === 0 ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          No watch history yet
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

export default HistoryPage;
