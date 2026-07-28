// server/src/routes/users.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { getProfile, updateProfile, changePassword, getAuthors, uploadAvatar } from '../controllers/users.js';

const router = Router();

// 获取当前用户资料
router.get('/profile', authenticate, getProfile);

// 更新当前用户资料
router.put('/profile', authenticate, updateProfile);

// 修改密码
router.put('/password', authenticate, changePassword);

// 获取作者列表
router.get('/authors', authenticate, getAuthors);

// 上传头像
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);

export default router;