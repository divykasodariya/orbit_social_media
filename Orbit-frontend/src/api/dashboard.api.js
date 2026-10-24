import http from "./http";

export const getChannelStats = () =>
  http.get("/dashboard/stats");

export const getChannelVideos = () =>
  http.get("/dashboard/videos");