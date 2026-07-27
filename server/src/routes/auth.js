// server/src/routes/auth.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/auth.js';

const router = Router();

// 公开接口
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// 需要登录的接口
router.get('/me', authenticate, getMe);

export default router;