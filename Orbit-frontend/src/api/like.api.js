import http from "./http";

export const toggleVideoLike = (videoId) =>
  http.post(`/likes/toggle/v/${videoId}`);

export const toggleCommentLike = (commentId) =>
  http.post(`/likes/toggle/c/${commentId}`);

export const toggleTweetLike = (tweetId) =>
  http.post(`/likes/toggle/t/${tweetId}`);

export const getLikedVideos = () =>
  http.get("/likes/videos");