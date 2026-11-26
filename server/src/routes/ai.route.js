import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import { chatAssistant, pollFromChat } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/chat", protectedRoute, chatAssistant);
router.post("/poll-from-chat", protectedRoute, pollFromChat);

export default router;
