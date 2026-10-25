import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
// video.routes.js - Make getVideoById work for both auth/non-auth

import {
  getAllVideos,
  getAllUserVideos,
  publishVideo,
  getVideoById,
  getVideoSubtitles,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getVideoRecommendations
} from "../controllers/video.controller.js";

const router = Router();

/* ================= PUBLIC ROUTES ================= */

// Home page
router.get("/", getAllVideos);

// 🔥 MUST be above :videoId
router.get("/user/videos", verifyJWT, getAllUserVideos);

// 🤖 Recommendations - must be ABOVE /:videoId
router.get("/recommendations/:videoId", verifyJWT, getVideoRecommendations);

// 📝 Subtitles in WebVTT format for video players (PUBLIC)
router.get("/:videoId/subtitles.vtt", getVideoSubtitles);

// Watch page (PUBLIC)
router.get("/:videoId", verifyJWT, getVideoById);

/* ================= PROTECTED ROUTES ================= */

// Upload
router.post(
  "/",
  verifyJWT,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  publishVideo
);

// Update / delete
router
  .route("/:videoId")
  .patch(verifyJWT, upload.single("thumbnail"), updateVideo)
  .delete(verifyJWT, deleteVideo);

// Publish toggle
router.patch("/toggle/publish/:videoId", verifyJWT, togglePublishStatus);

export default router;




// import { Router } from "express";
// import { verifyJWT } from "../middlewares/auth.middleware.js";
// import { upload } from "../middlewares/multer.middleware.js";

// import {
//   getAllVideos,
//   getAllUserVideos,
//   publishVideo,
//   getVideoById,
//   updateVideo,
//   deleteVideo,
//   togglePublishStatus
// } from "../controllers/video.controller.js";

// const router = Router();

// /* ================= PUBLIC ROUTES ================= */

// // Home page videos
// router.get("/", getAllVideos);

// // Watch page video
// router.get("/:videoId", getVideoById);

// /* ================= PROTECTED ROUTES ================= */

// router.use(verifyJWT);

// // Upload video
// router.post(
//   "/",
//   upload.fields([
//     { name: "videoFile", maxCount: 1 },
//     { name: "thumbnail", maxCount: 1 }
//   ]),
//   publishVideo
// );

// // Logged-in user's videos
// router.get("/user/videos", getAllUserVideos);

// // Update / delete video
// router
//   .route("/:videoId")
//   .delete(deleteVideo)
//   .patch(upload.single("thumbnail"), updateVideo);

// // Publish / unpublish
// router.patch("/toggle/publish/:videoId", togglePublishStatus);

// export default router;
