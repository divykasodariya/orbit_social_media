import { Router } from "express";
import{
    getUserChannelSubscribers,
    getSubscribedChannels,
    toggleSubscription
} from "../controllers/subscription.controller.js"

import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT) // Apply verifyJWT middleware to all routes in the file

router
    .route("/c/:channelId")
    // .get(getSubscribedChannels)
    .post(toggleSubscription)

router.get("/me/channels", getSubscribedChannels);

// router.route("/u/:subscriberId").get(getUserChannelSubscribers)
router.get("/c/:channelId", getUserChannelSubscribers);


export default router