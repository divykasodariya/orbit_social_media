import http from "./http";

export const createTweet = (data) =>
  http.post("/tweets", data);

export const getAllTweets = () =>
  http.get("/tweets");

export const getUserTweets = (userId) =>
  http.get(`/tweets/user/${userId}`);

export const updateTweet = (tweetId, data) =>
  http.patch(`/tweets/${tweetId}`, data);

export const deleteTweet = (tweetId) =>
  http.delete(`/tweets/${tweetId}`);

export const getTweetComments = (tweetId) =>
  http.get(`/comments/t/${tweetId}`);

export const addTweetComment = (tweetId, content) =>
  http.post(`/comments/t/${tweetId}`, { content });