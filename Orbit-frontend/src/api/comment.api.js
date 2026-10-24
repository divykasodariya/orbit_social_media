import http from "./http";

export const getVideoComments = (videoId) =>
  http.get(`/comments/${videoId}`);

export const addComment = (videoId, data) =>
  http.post(`/comments/${videoId}`, data);

export const updateComment = (commentId, data) =>
  http.patch(`/comments/c/${commentId}`, data);

export const deleteComment = (commentId) =>
  http.delete(`/comments/c/${commentId}`);