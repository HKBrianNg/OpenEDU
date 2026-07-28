// server/src/routes/users.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/users.js';

const router = Router();

// 获取当前用户资料
router.get('/profile', authenticate, getProfile);

// 更新当前用户资料
router.put('/profile', authenticate, updateProfile);

export default router;