// ============================================
// 1. FIXED VideoCard.jsx - Better Channel Data Handling
// ============================================
import { Link } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import {
  formatDuration,
  formatViews,
  formatDate,
} from "../../utils/helpers";

const VideoCard = ({ video, layout = "grid" }) => {
  if (!video) return null;

  /**
   * ✅ ROBUST CHANNEL DETECTION
   * Handles 3 cases:
   * 1. video.channel (object) - from Home/getAllVideos
   * 2. video.owner (object) - from Studio/getUserVideos
   * 3. video.owner (_id string) - fallback (no avatar shown)
   */
  const getChannelData = () => {
    // Case 1: video.channel exists and is an object
    if (video.channel && typeof video.channel === "object") {
      return video.channel;
    }
    
    // Case 2: video.owner exists and is an object
    if (video.owner && typeof video.owner === "object") {
      return video.owner;
    }
    
    // Case 3: No channel data available
    return null;
  };

  const channel = getChannelData();

  if (layout === "list") {
    return (
      <div className="group flex gap-3 transition-all duration-200 hover:-translate-y-0.5 animate-[cardIn_0.35s_ease-out]">
        {/* ================= THUMBNAIL ================= */}
        <Link
          to={`/watch/${video._id}`}
          className="flex-shrink-0 w-36 sm:w-40 xl:w-44"
        >
          <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-200 shadow-2xs">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/640x360?text=No+Thumbnail";
              }}
            />
            {video.duration && (
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
                {formatDuration(video.duration)}
              </div>
            )}
          </div>
        </Link>

        {/* ================= INFO ================= */}
        <div className="flex-1 min-w-0 flex flex-col justify-start py-0.5">
          <Link to={`/watch/${video._id}`}>
            <h3
              className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors"
              title={video.title}
            >
              {video.title}
            </h3>
          </Link>

          {channel?.fullName && (
            <Link
              to={channel.username ? `/channel/${channel.username}` : "#"}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors mt-1 block truncate"
            >
              {channel.fullName}
            </Link>
          )}

          <div className="text-[11px] sm:text-xs text-gray-500 mt-1 flex items-center flex-wrap gap-x-1">
            <span>{formatViews(video.views)} views</span>
            <span>•</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>
        </div>

        {/* MENU */}
        <button
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-full h-fit text-gray-500 transition-all self-start flex-shrink-0"
          aria-label="Options"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="group transition-all duration-300 hover:-translate-y-0.5 animate-[cardIn_0.35s_ease-out]"
    >
      {/* ================= THUMBNAIL ================= */}
      <Link to={`/watch/${video._id}`} className="block">
        <div className="relative w-full overflow-hidden rounded-xl bg-gray-200">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/640x360?text=No+Thumbnail";
            }}
          />

          {video.duration && (
            <div
              className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded transition-opacity duration-300 group-hover:opacity-100"
            >
              {formatDuration(video.duration)}
            </div>
          )}
        </div>
      </Link>

      {/* ================= INFO ================= */}
      <div className="mt-3 flex gap-3">
        {/* CHANNEL AVATAR */}
        {channel?.avatar && channel?.username && (
          <Link
            to={`/channel/${channel.username}`}
            className="flex-shrink-0"
          >
            <img
              src={channel.avatar}
              alt={channel.fullName || channel.username}
              className="w-9 h-9 rounded-full transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/40?text=?";
              }}
            />
          </Link>
        )}

        <div className="flex-1 min-w-0">
          {/* TITLE */}
          <Link to={`/watch/${video._id}`}>
            <h3
              className="font-semibold text-sm line-clamp-2 transition-colors duration-200 group-hover:text-blue-600"
            >
              {video.title}
            </h3>
          </Link>

          {/* CHANNEL NAME */}
          {channel?.fullName && channel?.username && (
            <Link
              to={`/channel/${channel.username}`}
              className="text-sm text-gray-600 hover:text-gray-900 block mt-1 transition-colors"
            >
              {channel.fullName}
            </Link>
          )}

          {/* META */}
          <div className="text-sm text-gray-600 mt-1">
            <span>{formatViews(video.views)} views</span>
            <span className="mx-1">•</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>
        </div>

        {/* MENU */}
        <button
          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-full h-fit transition-all duration-200 transform group-hover:scale-105"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
};

export default VideoCard;