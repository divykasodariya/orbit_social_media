import { Router } from "express";
import { getPath, getTraverse } from "../controllers/graph.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/path/:userId", getPath);
router.get("/traverse/:userId", getTraverse);

export default router;
