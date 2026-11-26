import express from "express";
import {
  listGroups,
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  listRequests,
  approveRequest,
  rejectRequest,
  listMembers,
  removeMember,
} from "../controllers/group.controller.js";
import { protectedRoute, adminOnly } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectedRoute, listGroups);
router.get("/requests", protectedRoute, adminOnly, listRequests);
router.post("/requests/:id/approve", protectedRoute, adminOnly, approveRequest);
router.delete("/requests/:id", protectedRoute, adminOnly, rejectRequest);
router.post("/", protectedRoute, adminOnly, createGroup);
router.get("/:id/members", protectedRoute, adminOnly, listMembers);
router.delete("/:id/members/:userId", protectedRoute, adminOnly, removeMember);
router.delete("/:id", protectedRoute, adminOnly, deleteGroup);
router.post("/:id/join", protectedRoute, joinGroup);
router.delete("/:id/leave", protectedRoute, leaveGroup);

export default router;
