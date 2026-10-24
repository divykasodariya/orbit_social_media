import { Link } from "react-router-dom";
import { Trash2, Pencil } from "lucide-react";

const PlaylistCard = ({ playlist, videoCount, onDelete }) => {
  return (
    <div
      className="border rounded-xl p-4 bg-white shadow
      transition-all duration-300
      hover:shadow-lg hover:-translate-y-1
      animate-[cardIn_0.35s_ease-out]"
    >
      {/* CLICKABLE AREA */}
      <Link to={`/playlists/${playlist._id}`}>
        <div className="mb-3 overflow-hidden rounded-lg">
          <div
            className="h-40 bg-gray-100 flex items-center justify-center
            text-gray-500 transition-transform duration-300
            hover:scale-105"
          >
            {videoCount > 0 ? (
              <span>{videoCount} videos</span>
            ) : (
              <span>No videos</span>
            )}
          </div>
        </div>

        <h3 className="font-semibold text-lg line-clamp-1">
          {playlist.name}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2">
          {playlist.description}
        </p>
      </Link>

      {/* ACTIONS */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-gray-600">
          {videoCount} videos
        </span>

        <div className="flex gap-2">
          <Link
            to={`/playlists/${playlist._id}?edit=true`}
            className="p-2 rounded hover:bg-gray-100
            transition transform hover:scale-110 active:scale-95"
            title="Edit playlist"
          >
            <Pencil size={16} />
          </Link>

          <button
            onClick={onDelete}
            className="p-2 rounded hover:bg-red-50 text-red-600
            transition transform hover:scale-110 active:scale-95"
            title="Delete playlist"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistCard;
