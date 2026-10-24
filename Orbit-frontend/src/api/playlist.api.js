import http from "./http";

/* ================= CREATE ================= */
export const createPlaylist = (data) =>
  http.post("/playlists", data);

/* ================= READ ================= */
export const getUserPlaylists = (userId) =>
  http.get(`/playlists/user/${userId}`);

export const getPlaylistById = (playlistId) =>
  http.get(`/playlists/${playlistId}`);

/* ================= UPDATE ================= */
export const updatePlaylist = (playlistId, data) =>
  http.patch(`/playlists/${playlistId}`, data);

export const addVideoToPlaylist = (videoId, playlistId) =>
  http.patch(`/playlists/add/${videoId}/${playlistId}`);

export const removeVideoFromPlaylist = (videoId, playlistId) =>
  http.patch(`/playlists/remove/${videoId}/${playlistId}`);

/* ================= DELETE ================= */
export const deletePlaylist = (playlistId) =>
  http.delete(`/playlists/${playlistId}`);