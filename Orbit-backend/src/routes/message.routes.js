import { Router } from "express";

import {
    sendMessage,
    getMessages
} from "../controllers/message.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All message routes require authentication
router.use(verifyJWT);

// Send a message
router.post("/:friendId", sendMessage);

// Get conversation
router.get("/:friendId", getMessages);

export default router;