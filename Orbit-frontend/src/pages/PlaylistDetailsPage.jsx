import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  getPlaylistById,
  deletePlaylist,
  updatePlaylist,
  removeVideoFromPlaylist,
} from "../api/playlist.api";
import VideoCard from "../components/video/VideoCard";
import {
  Trash2,
  ArrowLeft,
  X,
  Save,
} from "lucide-react";

const PlaylistDetailsPage = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        const res = await getPlaylistById(playlistId);
        const data = res.data.data;

        setPlaylist(data);
        setName(data.name);
        setDescription(data.description);

        if (searchParams.get("edit") === "true") {
          setShowEdit(true);
        }
      } catch {
        alert("Failed to load playlist");
        navigate("/playlists");
      } finally {
        setLoading(false);
      }
    };

    loadPlaylist();
  }, [playlistId, navigate, searchParams]);

  const handleUpdate = async () => {
    if (!name.trim() || !description.trim()) {
      return alert("Name and description are required");
    }

    try {
      setSaving(true);
      const res = await updatePlaylist(playlistId, {
        name,
        description,
      });
      setPlaylist(res.data.data);
      setShowEdit(false);
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this playlist?")) return;
    await deletePlaylist(playlistId);
    navigate("/playlists");
  };

  const handleRemoveVideo = async (videoId) => {
    if (!window.confirm("Remove video from this playlist?")) return;

    try {
      await removeVideoFromPlaylist(videoId, playlistId);
      setPlaylist((prev) => ({
        ...prev,
        videos: prev.videos.filter((v) => v._id !== videoId),
      }));
    } catch {
      alert("Failed to remove video");
    }
  };

  if (loading) {
    return (
      <div className="mt-10 text-center animate-[fadeIn_0.3s_ease-out]">
        Loading playlist...
      </div>
    );
  }

  if (!playlist) return null;

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      {/* BACK */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-4
        text-gray-600 hover:text-black transition"
      >
        <ArrowLeft size={18} /> Back
      </button>

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {playlist.name}
          </h1>
          <p className="text-gray-600">
            {playlist.description}
          </p>
        </div>

        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2
          bg-red-600 text-white rounded
          transition hover:bg-red-700 active:scale-[0.98]"
        >
          <Trash2 size={18} /> Delete
        </button>
      </div>

      {/* VIDEOS */}
      {playlist.videos.length === 0 ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          No videos added to this playlist yet
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlist.videos.map((video, i) => (
            <div
              key={video._id}
              style={{ animationDelay: `${i * 0.04}s` }}
              className="relative group animate-[cardIn_0.4s_ease-out]"
            >
              <VideoCard video={video} />

              <button
                onClick={() => handleRemoveVideo(video._id)}
                className="absolute top-2 right-2
                bg-black/70 text-white p-2 rounded-full
                opacity-0 group-hover:opacity-100
                transition-all duration-200"
                title="Remove from playlist"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50
          flex items-center justify-center animate-[fadeIn_0.2s_ease-out]">
          <div
            className="bg-white w-full max-w-md rounded-xl p-6 relative
            animate-[cardIn_0.3s_ease-out]"
          >
            <button
              onClick={() => setShowEdit(false)}
              className="absolute top-4 right-4
              text-gray-500 hover:text-gray-800 transition"
            >
              <X />
            </button>

            <h2 className="text-xl font-semibold mb-4">
              Edit Playlist
            </h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border px-4 py-2 rounded mb-3"
              placeholder="Playlist name"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border px-4 py-2 rounded mb-4"
              rows={3}
              placeholder="Description"
            />

            <button
              disabled={saving}
              onClick={handleUpdate}
              className="w-full flex items-center justify-center gap-2
              bg-blue-600 text-white py-2 rounded
              transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistDetailsPage;
