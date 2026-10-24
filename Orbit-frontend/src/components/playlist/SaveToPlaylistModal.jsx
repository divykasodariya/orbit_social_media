// ============================================
// 2. FIXED SaveToPlaylistModal.jsx - Add Error Handling
// ============================================
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getUserPlaylists,
  createPlaylist,
  addVideoToPlaylist,
} from "../../api/playlist.api";
import { X } from "lucide-react";

const SaveToPlaylistModal = ({ videoId, onClose }) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?._id) return;

    const loadPlaylists = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getUserPlaylists(user._id);
        setPlaylists(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        console.error("Failed to load playlists", err);
        setError("Failed to load playlists");
        setPlaylists([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylists();
  }, [user]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Playlist name is required");
      return;
    }

    try {
      setError("");
      await createPlaylist({ name, description: "" });
      setName("");

      // Reload playlists
      const res = await getUserPlaylists(user._id);
      setPlaylists(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create playlist");
    }
  };

  const handleAdd = async (playlistId) => {
    try {
      await addVideoToPlaylist(videoId, playlistId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add video");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50
      animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-xl p-6 relative
        animate-[cardIn_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500
          hover:text-gray-800 transition"
        >
          <X />
        </button>

        <h2 className="font-semibold text-lg mb-4">Save to playlist</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
            px-3 py-2 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading playlists...
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {playlists.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No playlists yet. Create one below!
                </p>
              ) : (
                playlists.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => handleAdd(p._id)}
                    className="w-full text-left px-3 py-2 border rounded
                    transition hover:bg-gray-100"
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New playlist name"
                className="flex-1 border rounded px-3 py-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded
                transition hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SaveToPlaylistModal;