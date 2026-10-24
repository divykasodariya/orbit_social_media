import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  withCredentials: true, // cookies allowed
});

/* 🔥 INTERCEPTOR */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    // ✅ ONLY attach token if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;













// import axios from "axios";

// /**
//  * Central axios instance for Orbit frontend
//  * - Uses backend base URL
//  * - Sends cookies (JWT refresh token)
//  * - Automatically attaches access token
//  */

// const axiosInstance = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL,
//   withCredentials: true,
// });

// /* ================= REQUEST INTERCEPTOR ================= */
// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("accessToken");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// /* ================= RESPONSE INTERCEPTOR ================= */
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     // If access token expired → try refresh once
//     if (
//       error.response?.status === 401 &&
//       !originalRequest._retry
//     ) {
//       originalRequest._retry = true;
//       try {
//         const res = await axios.post(
//           `${import.meta.env.VITE_API_BASE_URL}/users/refresh-token`,
//           {},
//           { withCredentials: true }
//         );

//         localStorage.setItem("accessToken", res.data.data.accessToken);
//         originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;

//         return axiosInstance(originalRequest);
//       } catch (err) {
//         localStorage.removeItem("accessToken");
//         window.location.href = "/login";
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;
