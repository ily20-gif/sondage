import express from "express";
import {
  createPoll, getPolls, getPoll, deletePoll,
  getUserPoll, updatePoll, setPollStatus, getPollsForAdminReview, getAllPollsAdmin
} from "../controllers/poll.controller.js";
import {
  generatePoll,
  suggestThemes,
} from "../controllers/ai.controller.js";
import { getResults } from "../controllers/results.controller.js";
import { protectedRoute, adminOnly, optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/:id/results", protectedRoute, getResults);

router.post("/generate", protectedRoute, generatePoll);
router.post("/suggest-themes", protectedRoute, suggestThemes);
router.post("/", protectedRoute, createPoll);
router.get("/", optionalAuth, getPolls);
router.get("/admin/review", protectedRoute, adminOnly, getPollsForAdminReview);
router.get("/admin/all", protectedRoute, adminOnly, getAllPollsAdmin);
router.get("/owner",protectedRoute, getUserPoll);
router.get("/:id",protectedRoute, getPoll);
router.put("/:id", protectedRoute, updatePoll);
router.patch("/:id/status", protectedRoute, setPollStatus);
router.delete("/:id", protectedRoute, deletePoll);


export default router;
