import http from "./http";

export const voteThread = (threadId, value) =>
  http.post(`/threads/${threadId}/vote`, { value });

export const removeThreadVote = (threadId) =>
  http.delete(`/threads/${threadId}/vote`);

export const createThread = (communityId, data) =>
  http.post(`/threads/community/${communityId}`, data);

export const getThreadComments = (threadId, page = 1, limit = 50) =>
  http.get(`/threads/${threadId}/comments?page=${page}&limit=${limit}`);

export const addThreadComment = (threadId, content) =>
  http.post(`/threads/${threadId}/comments`, { content });
