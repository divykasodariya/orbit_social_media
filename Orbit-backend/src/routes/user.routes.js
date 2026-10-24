import { Router } from "express";
import { loginUser, logoutUser, registerUser,refreshAccessToken,
    changeCurrentPassword, getCurrentUser, updateAccountDetails,
    updateUserAvatar, updateCoverImageAvatar, getUserChannelProfile,
    getWatchHistory, searchUsers} from "../controllers/user.controller.js";

import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

// router.route("/register").post(
//     upload.fields([
//         { name: "avatar", maxCount: 1 },
//         { name: "coverImage", maxCount: 1 }
//     ]),
//     registerUser
// )

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    (req, res, next) => {
        console.log("🔥 Multer DEBUG middleware");
        console.log("FILES:", req.files);
        console.log("BODY:", req.body);
        next();
    },
    registerUser
)

router.route("/login").post(loginUser)


// secured Routes

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImageAvatar)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

import { getMutuals } from "../controllers/graph.controller.js";

// router.route("/c/:username").get(getUserChannelProfile)

router.route("/history").get(verifyJWT, getWatchHistory)
router.route("/search").get(verifyJWT, searchUsers)
router.route("/:userId/mutuals").get(verifyJWT, getMutuals)



// router.route("/register").post(
//     upload.fields([
//         {
//             name: "avatar",
//             maxCount: 1
//         },
//         {
//             name: "coverImage",
//             maxCount: 1
//         }
//     ]),
//     registerUser
// )

export default router