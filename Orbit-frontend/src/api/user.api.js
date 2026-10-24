import http from "./http";

/* ================= AUTH ================= */
export const login = (credentials) =>
  http.post("/users/login", credentials);

export const register = (formData) =>
  http.post("/users/register", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const logout = () =>
  http.post("/users/logout");

export const refreshToken = () =>
  http.post("/users/refresh-token");

/* ================= USER DATA ================= */
export const getCurrentUser = () =>
  http.get("/users/current-user");

export const updateAccountDetails = (data) =>
  http.patch("/users/update-account", data);

export const changePassword = (data) =>
  http.post("/users/change-password", data);

export const updateUserAvatar = (data) =>
  http.patch("/users/avatar", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const updateCoverImage = (data) =>
  http.patch("/users/cover-image", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const getUserChannelProfile = (username) =>
  http.get(`/users/c/${username}`);

export const getWatchHistory = () =>
  http.get("/users/history");

export const searchUsers = (query) =>
  http.get(`/users/search?q=${encodeURIComponent(query)}`);