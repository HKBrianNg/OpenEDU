// server/src/index.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';  // 添加这一行
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';

import { getMessage } from './constants/messages.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
  });
  next();
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 认证路由
app.use('/api/auth', authRoutes);

// 用户维护
app.use('/api/users', usersRoutes);

// 管理员接口
app.use('/api/admin', adminRoutes);

// 404 处理
app.use((req, res) => {
  const lang = req.headers['accept-language']?.split(',')[0] || 'zh-CN';
  res.status(404).json({
    code: 'NOT_FOUND',
    message: getMessage('NOT_FOUND', lang),
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  const lang = req.headers['accept-language']?.split(',')[0] || 'zh-CN';

  // 处理 multer 上传错误
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      code: 'UPLOAD_ERROR',
      message: err.code === 'LIMIT_FILE_SIZE' ? '文件大小不能超过5MB' : err.message,
    });
  }

  // 处理 fileFilter 抛出的错误
  if (err.message && (
    err.message.includes('只允许上传') ||
    err.message.includes('JPG、PNG、GIF、WebP')
  )) {
    return res.status(400).json({
      code: 'INVALID_FILE_TYPE',
      message: err.message,
    });
  }

  logger.error('Unhandled error:', err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: getMessage('INTERNAL_ERROR', lang),
  });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});