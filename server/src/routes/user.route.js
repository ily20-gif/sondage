import { changeProfileImage, deleteAccount, updateProfile } from '../controllers/user.controller.js';
import { protectedRoute } from '../middleware/auth.middleware.js';
import express from 'express'
import upload from '../middleware/upload.middleware.js';
import { clerkAuth } from '../controllers/auth.controller.js';
const router=express.Router()
router.delete('/account', protectedRoute, deleteAccount);
router.put('/profile', protectedRoute, updateProfile);
const handleImageUploadError = (error, req, res, next) => {
  if (!error) return next();
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "La photo ne doit pas dépasser 5 Mo." });
  }
  return res.status(400).json({ message: error.message || "Fichier image invalide." });
};

router.put(
  "/profile/image",
  protectedRoute,
  upload.single("image"),
  handleImageUploadError,
  changeProfileImage
);
export default router