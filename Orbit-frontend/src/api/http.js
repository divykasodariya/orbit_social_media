// ============================================
// FIXED http.js - No Infinite Loops
// ============================================

import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ✅ REQUEST INTERCEPTOR
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Let browser set multipart boundary automatically for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ RESPONSE INTERCEPTOR - Fixed to prevent infinite loops
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ❌ DON'T refresh if:
    // 1. Already retried
    // 2. Request is to login/register/refresh endpoints
    // 3. No error response (network error)
    if (
      originalRequest._retry ||
      !error.response ||
      originalRequest.url?.includes("/login") ||
      originalRequest.url?.includes("/register") ||
      originalRequest.url?.includes("/refresh-token")
    ) {
      return Promise.reject(error);
    }

    // ✅ Only attempt refresh on 401
    if (error.response?.status === 401) {
      
      // ✅ If no refreshToken available at all, don't even try - just reject
      const storedRefreshToken = localStorage.getItem("refreshToken");
      if (!storedRefreshToken) {
        return Promise.reject(error);
      }

      // ✅ If refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => http(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ Send refreshToken in body as fallback for browsers that block cookies (Safari, Chrome mobile)
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/users/refresh-token`,
          { refreshToken: storedRefreshToken },
          { withCredentials: true }
        );

        // ✅ Save new tokens
        if (data.data?.accessToken) {
          localStorage.setItem("accessToken", data.data.accessToken);
        }
        if (data.data?.refreshToken) {
          localStorage.setItem("refreshToken", data.data.refreshToken);
        }

        processQueue(null, data.data?.accessToken);
        isRefreshing = false;

        // ✅ Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.data?.accessToken}`;
        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // ✅ Only clear tokens if refresh actually failed (token truly expired/invalid)
        // Do NOT clear if it was a network error
        if (refreshError.response?.status === 401) {
          console.log("🔴 Refresh token invalid/expired - clearing auth");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default http;