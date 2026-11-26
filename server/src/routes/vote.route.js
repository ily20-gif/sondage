import express from "express";
import { votePoll } from "../controllers/vote.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectedRoute, votePoll);

export default router;
