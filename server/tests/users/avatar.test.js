// tests/users/avatar.test.js
import '../setup.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authRoutes from '../../src/routes/auth.js';
import usersRoutes from '../../src/routes/users.js';
import { logTestResult, logTestSuite, logTestSummary } from '../utils.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// multer 错误处理
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      code: 'UPLOAD_ERROR',
      message: err.code === 'LIMIT_FILE_SIZE' ? '文件大小不能超过5MB' : err.message,
    });
  }

  if (err.message && (
    err.message.includes('只允许上传') ||
    err.message.includes('JPG、PNG、GIF、WebP')
  )) {
    return res.status(400).json({
      code: 'INVALID_FILE_TYPE',
      message: err.message,
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: '服务器内部错误',
  });
});

const TEST_EMAIL = 'reader@openedu.com';
const TEST_PASSWORD = 'Test123456';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let token;

afterAll(async () => {
  logTestSummary(totalTests, passedTests, failedTests);
});

describe('Avatar Upload Tests', () => {
  logTestSuite('Avatar Upload Tests');

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    token = loginRes.body.token;
  });

  // ============ 未认证测试 ============

  it('should reject without token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/users/avatar');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');

      passedTests++;
      logTestResult('Reject without token', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject without token', false);
      throw error;
    }
  });

  // ============ 文件类型校验 ============

  it('should reject non-image file', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/users/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from('not an image'), 'test.txt');

      expect(res.status).toBe(400);

      passedTests++;
      logTestResult('Reject non-image file', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject non-image file', false);
      throw error;
    }
  });

  // ============ 成功上传测试 ============

  it('should upload avatar successfully', async () => {
    totalTests++;
    try {
      // 创建一个 1x1 像素的 PNG 图片
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x00,
        0x00, 0x00, 0x04, 0x00, 0x01, 0x27, 0x34, 0x27,
        0x0E, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82,
      ]);

      const res = await request(app)
        .post('/api/users/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', pngBuffer, 'test-avatar.png');

      expect(res.status).toBe(200);
      expect(res.body.avatar_url).toBeDefined();
      expect(res.body.avatar_url).toMatch(/^\/uploads\/avatars\//);

      passedTests++;
      logTestResult('Upload avatar successfully', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Upload avatar successfully', false);
      throw error;
    }
  });

  // ============ 验证头像持久化 ============

  it('should persist avatar URL in profile', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.avatar_url).toBeDefined();
      expect(res.body.avatar_url).toMatch(/^\/uploads\/avatars\//);

      passedTests++;
      logTestResult('Persist avatar URL in profile', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Persist avatar URL in profile', false);
      throw error;
    }
  });
});