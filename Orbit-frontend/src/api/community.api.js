import http from "./http";

export const getCommunities = () => http.get("/communities");
export const getCommunity = (slug) => http.get(`/communities/${slug}`);
export const searchCommunities = (q) => http.get(`/communities/search?q=${q}`);
export const joinCommunity = (id) => http.post(`/communities/${id}/join`);
export const leaveCommunity = (id) => http.post(`/communities/${id}/leave`);
export const getCommunityThreads = (communityId) => http.get(`/threads/community/${communityId}`);
export const createThread = (communityId, data) => http.post(`/threads/community/${communityId}`, data);
export const createCommunity = (data) => http.post("/communities", data);
export const getCommunityMembers = (id) => http.get(`/communities/${id}/members`);
export const updateCommunity = (id, data) => http.patch(`/communities/${id}`, data);
export const deleteCommunity = (id) => http.delete(`/communities/${id}`);
