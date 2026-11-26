import express from 'express';
import {  getAllNotifications } from '../controllers/notifications.controller.js';
import { protectedRoute } from '../middleware/auth.middleware.js';

const router = express.Router();


router.get('/',protectedRoute, getAllNotifications);

export default router;