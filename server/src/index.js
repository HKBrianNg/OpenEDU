import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';

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
  logger.error('Unhandled error:', err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: getMessage('INTERNAL_ERROR', lang),
  });
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});