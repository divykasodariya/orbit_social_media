import http from "./http";

export const toggleSubscription = (channelId) =>
  http.post(`/subscriptions/c/${channelId}`);

export const getSubscribedChannels = () =>
  http.get("/subscriptions/me/channels");

export const getChannelSubscribers = (channelId) =>
  http.get(`/subscriptions/c/${channelId}`);