import express from "express";
import { protectedRoute, adminOnly } from "../middleware/auth.middleware.js";
import {
  getStats,
  listUsers,
  setUserRole,
  deleteUser,
  listVotes,
  deleteVote,
} from "../controllers/admin.controller.js";

const router = express.Router();

// Tout ce routeur est réservé aux administrateurs
router.use(protectedRoute, adminOnly);

router.get("/stats", getStats);
router.get("/users", listUsers);
router.patch("/users/:id/role", setUserRole);
router.delete("/users/:id", deleteUser);
router.get("/votes", listVotes);
router.delete("/votes/:id", deleteVote);

export default router;
