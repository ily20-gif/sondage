import express from 'express'
import { protectedRoute } from '../middleware/auth.middleware.js';
import { getMessages, sendMessage } from '../controllers/chat.controller.js';

const router=express.Router()
router.post('/',protectedRoute,sendMessage)
router.get("/",protectedRoute,getMessages);

export default router