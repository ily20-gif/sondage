import express from 'express'
import {  checkAuth, clerkAuth, login, logout, signup, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail } from '../controllers/auth.controller.js';
import { protectedRoute } from '../middleware/auth.middleware.js';

const router=express.Router()
router.post('/signup',signup)
router.post("/login",login);
router.post("/logout",logout);
router.get("/check",protectedRoute,checkAuth);
router.post("/clerk", clerkAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
export default router