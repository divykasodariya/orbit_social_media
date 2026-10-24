import { useState } from "react";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  updatePlaylist,
  deletePlaylist
} from "../api/playlist.api";

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUserPlaylists = async (userId) => {
    setLoading(true);
    const res = await getUserPlaylists(userId);
    setPlaylists(res.data.data);
    setLoading(false);
  };

  const fetchPlaylist = async (playlistId) => {
    const res = await getPlaylistById(playlistId);
    setPlaylist(res.data.data);
  };

  const createNewPlaylist = async (data) => {
    const res = await createPlaylist(data);
    setPlaylists(prev => [...prev, res.data.data]);
  };

  const addVideo = async (videoId, playlistId) => {
    await addVideoToPlaylist(videoId, playlistId);
  };

  const removeVideo = async (videoId, playlistId) => {
    await removeVideoFromPlaylist(videoId, playlistId);
  };

  const update = async (playlistId, data) => {
    const res = await updatePlaylist(playlistId, data);
    setPlaylists(prev =>
      prev.map(p => (p._id === playlistId ? res.data.data : p))
    );
  };

  const removePlaylist = async (playlistId) => {
    await deletePlaylist(playlistId);
    setPlaylists(prev => prev.filter(p => p._id !== playlistId));
  };

  return {
    playlists,
    playlist,
    loading,
    fetchUserPlaylists,
    fetchPlaylist,
    createNewPlaylist,
    addVideo,
    removeVideo,
    update,
    removePlaylist
  };
};
