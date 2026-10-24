import http from "./http";

/* PUBLIC */
export const getAllVideos = (query = "") =>
  http.get(`/videos${query ? `?query=${query}` : ""}`);

export const getVideoById = (videoId) =>
  http.get(`/videos/${videoId}`);

/* PROTECTED */
// export const publishVideo = (data) =>
//   http.post("/videos", data);

export const publishVideo = (formData) =>
  http.post("/videos", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const getUserVideos = (userId) =>
  http.get(`/videos/user/videos?userId=${userId}`);

export const updateVideo = (videoId, data) =>
  http.patch(`/videos/${videoId}`, data);

export const deleteVideo = (videoId) =>
  http.delete(`/videos/${videoId}`);

export const togglePublishStatus = (videoId) =>
  http.patch(`/videos/toggle/publish/${videoId}`);

export const getVideoRecommendations = (videoId, limit = 10) =>
  http.get(`/videos/recommendations/${videoId}?limit=${limit}`);