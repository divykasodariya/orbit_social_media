import http from "./http";

export const getFriends = () => http.get("/friends");
export const getFriendRequests = () => http.get("/friends/requests");

export const sendFriendRequest = (userId) => http.post(`/friends/request/${userId}`);
export const acceptFriendRequest = (requestId) => http.post(`/friends/request/${requestId}/accept`);
export const rejectFriendRequest = (requestId) => http.post(`/friends/request/${requestId}/reject`);
export const cancelFriendRequest = (requestId) => http.delete(`/friends/request/${requestId}`);
export const removeFriend = (userId) => http.delete(`/friends/${userId}`);

// Graph-based user routes
export const getUserFriends = (userId) => http.get(`/users/${userId}/friends`);
export const getMutualFriends = (userId) => http.get(`/users/${userId}/mutual-friends`);
export const getConnectionPath = (userId) => http.get(`/users/${userId}/connection-path`);

// Recommendations (People you might know)
export const getSuggestedUsers = () => http.get("/recommendations/users");
