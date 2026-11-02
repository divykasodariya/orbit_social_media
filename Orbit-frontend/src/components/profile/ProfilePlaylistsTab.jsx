import { useEffect, useState } from "react";
import { getUserPlaylists } from "../../api/playlist.api";
import PlaylistCard from "../playlist/PlaylistCard";
import Loader from "../common/Loader";
import EmptyState from "../common/EmptyState";

const ProfilePlaylistsTab = ({ userId, isOwnProfile = false }) => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    if (!isOwnProfile) {
      setPlaylists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserPlaylists(userId)
      .then((res) => {
        const data = res.data?.data;
        setPlaylists(Array.isArray(data) ? data : []);
      })
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, [userId, isOwnProfile]);

  if (loading) return <Loader />;

  if (!playlists.length) {
    return (
      <EmptyState
        title="No playlists yet"
        description={
          isOwnProfile
            ? "You haven't created any playlists yet."
            : "This user hasn't created any playlists yet."
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeIn_0.35s_ease-out]">
      {playlists.map((playlist) => (
        <PlaylistCard
          key={playlist._id}
          playlist={playlist}
          videoCount={playlist.videos?.length || 0}
        />
      ))}
    </div>
  );
};

export default ProfilePlaylistsTab;

