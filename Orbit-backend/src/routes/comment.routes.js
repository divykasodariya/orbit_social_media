import { Router } from "express";

import {
    getVideoComment,
    addComment,
    updateComment,
    deleteComment,
    getTweetComments,
    addTweetComment
} from "../controllers/comment.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router()

router.use(verifyJWT)

router.route("/:videoId")
    .get(getVideoComment)
    .post(addComment)

router.route("/c/:commentId")
    .delete(deleteComment)
    .patch(updateComment)

router.route("/t/:tweetId")
    .get(getTweetComments)
    .post(addTweetComment)

export default router