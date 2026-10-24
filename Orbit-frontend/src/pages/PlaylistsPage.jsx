import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getUserPlaylists,
  createPlaylist,
  deletePlaylist,
} from "../api/playlist.api";
import PlaylistCard from "../components/playlist/PlaylistCard";
import { ListVideo, Plus, X } from "lucide-react";

const PlaylistsPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?._id) {
      setLoading(false);
      return;
    }

    const loadPlaylists = async () => {
      try {
        setLoading(true);
        const res = await getUserPlaylists(user._id);
        setPlaylists(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        console.error("Failed to load playlists", err);
        setPlaylists([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylists();
  }, [authLoading, isAuthenticated, user]);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) {
      return alert("Name and description are required");
    }

    try {
      setCreating(true);
      const res = await createPlaylist({ name, description });
      setPlaylists((prev) => [res.data.data, ...prev]);
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create playlist");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (playlistId) => {
    if (!window.confirm("Delete this playlist?")) return;

    try {
      await deletePlaylist(playlistId);
      setPlaylists((prev) =>
        prev.filter((p) => p._id !== playlistId)
      );
    } catch {
      alert("Failed to delete playlist");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="text-center mt-10 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Loading playlists...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center mt-16 text-gray-600 animate-[fadeIn_0.3s_ease-out]">
        Login to manage playlists
      </div>
    );
  }

  return (
    <div className="animate-[fadeIn_0.35s_ease-out]">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ListVideo size={28} /> Your Playlists
        </h1>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2
          bg-blue-600 text-white rounded-lg
          transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          <Plus size={18} /> Create Playlist
        </button>
      </div>

      {/* CONTENT */}
      {playlists.length === 0 ? (
        <p className="text-gray-500 animate-[fadeIn_0.3s_ease-out]">
          You haven’t created any playlists yet
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist, i) => (
            <div
              key={playlist._id}
              style={{ animationDelay: `${i * 0.05}s` }}
              className="animate-[cardIn_0.4s_ease-out]"
            >
              <PlaylistCard
                playlist={playlist}
                videoCount={playlist.videos?.length || 0}
                onDelete={() => handleDelete(playlist._id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50
          flex items-center justify-center animate-[fadeIn_0.2s_ease-out]">
          <div
            className="bg-white w-full max-w-md rounded-xl p-6 relative
            animate-[cardIn_0.3s_ease-out]"
          >
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4
              text-gray-500 hover:text-gray-800 transition"
            >
              <X />
            </button>

            <h2 className="text-xl font-semibold mb-4">
              Create Playlist
            </h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Playlist name"
              className="w-full border px-4 py-2 rounded mb-3"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full border px-4 py-2 rounded mb-4"
              rows={3}
            />

            <button
              disabled={creating}
              onClick={handleCreate}
              className="w-full bg-blue-600 text-white py-2 rounded
              transition hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistsPage;
