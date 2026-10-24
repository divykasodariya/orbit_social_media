import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getUserVideos,
  togglePublishStatus,
  deleteVideo,
} from "../api/video.api";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { formatViews, formatDate } from "../utils/helpers";

const UserVideosPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?._id) return;

    const loadVideos = async () => {
      try {
        setLoading(true);
        const res = await getUserVideos(user._id);
        const docs = res?.data?.data?.docs;
        setVideos(Array.isArray(docs) ? docs : []);
      } catch (err) {
        console.error("Failed to load user videos", err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [authLoading, isAuthenticated, user]);

  const handleTogglePublish = async (videoId) => {
    try {
      await togglePublishStatus(videoId);
      setVideos((prev) =>
        prev.map((v) =>
          v._id === videoId
            ? { ...v, isPublished: !v.isPublished }
            : v
        )
      );
    } catch (err) {
      console.error("Publish toggle failed", err);
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm("Delete this video?")) return;

    try {
      await deleteVideo(videoId);
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="text-center mt-10 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Loading videos...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center mt-16 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Login to manage your videos
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Your Videos</h1>
        <Link
          to="/upload"
          className="px-5 py-2 bg-blue-600 text-white rounded-lg
          transition hover:bg-blue-700 active:scale-[0.98]"
        >
          Upload Video
        </Link>
      </div>

      {videos.length === 0 ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          No videos uploaded yet
        </p>
      ) : (
        <>
          {/* MOBILE / TABLET */}
          <div className="space-y-4 lg:hidden">
            {videos.map((video, i) => (
              <div
                key={video._id}
                style={{ animationDelay: `${i * 0.04}s` }}
                className="bg-white border rounded-xl p-4 flex gap-4
                animate-[cardIn_0.4s_ease-out]"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-32 h-20 object-cover rounded-lg"
                />

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/watch/${video._id}`}
                    className="font-semibold block line-clamp-1
                    hover:text-blue-600 transition"
                  >
                    {video.title}
                  </Link>

                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {video.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-2">
                    <span>{formatViews(video.views)} views</span>
                    <span>{formatDate(video.createdAt)}</span>
                  </div>

                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() =>
                        handleTogglePublish(video._id)
                      }
                      className="p-2 bg-gray-100 rounded
                      transition hover:bg-gray-200"
                    >
                      {video.isPublished ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(video._id)}
                      className="p-2 bg-red-50 text-red-600 rounded
                      transition hover:bg-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden lg:block bg-white border rounded-xl overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4">Video</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Views</th>
                  <th className="text-left px-6 py-4">Date</th>
                  <th className="text-right px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {videos.map((video, i) => (
                  <tr
                    key={video._id}
                    style={{ animationDelay: `${i * 0.03}s` }}
                    className="border-b hover:bg-gray-50
                    animate-[fadeIn_0.35s_ease-out]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-32 rounded-lg object-cover"
                        />
                        <div>
                          <Link
                            to={`/watch/${video._id}`}
                            className="font-semibold hover:text-blue-600"
                          >
                            {video.title}
                          </Link>
                          <p className="text-sm text-gray-500 line-clamp-1">
                            {video.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1
                        rounded-full text-sm ${
                          video.isPublished
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {video.isPublished ? (
                          <>
                            <Eye size={14} /> Published
                          </>
                        ) : (
                          <>
                            <EyeOff size={14} /> Draft
                          </>
                        )}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {formatViews(video.views)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(video.createdAt)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            handleTogglePublish(video._id)
                          }
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          {video.isPublished ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(video._id)
                          }
                          className="p-2 hover:bg-red-50
                          text-red-600 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default UserVideosPage;
