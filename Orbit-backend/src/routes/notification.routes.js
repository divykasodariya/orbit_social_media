import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getNotifications,
    markAsRead,
    markAllAsRead
} from "../controllers/notification.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getNotifications);
router.route("/read-all").patch(markAllAsRead);
router.route("/:id/read").patch(markAsRead);

export default router;
