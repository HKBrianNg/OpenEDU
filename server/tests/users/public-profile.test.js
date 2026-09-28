import '../setup.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../src/routes/auth.js';
import usersRoutes from '../../src/routes/users.js';
import { logTestResult, logTestSuite, logTestSummary } from '../utils.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

const READER_EMAIL = 'reader@openedu.com';
const TEST_PASSWORD = 'Test123456';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let readerId;
let authorId;

afterAll(async () => {
  logTestSummary(totalTests, passedTests, failedTests);
});

describe('Public Profile Tests', () => {
  logTestSuite('Public Profile Tests');

  beforeAll(async () => {
    // 登录获取用户 ID
    const readerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: READER_EMAIL, password: TEST_PASSWORD });

    readerId = readerLogin.body.user?.id || readerLogin.body.id;

 
  });

  // ============ 无需登录即可访问 ============

  it('should return reader public profile without token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get(`/api/users/${readerId}/profile`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(READER_EMAIL);
      expect(res.body.nickname).toBe('读者测试员');
      expect(res.body.role).toBe('reader');
      expect(res.body.id).toBeDefined();
      expect(res.body.created_at).toBeDefined();

      // 不返回敏感字段
      expect(res.body.password_hash).toBeUndefined();
      expect(res.body.status).toBeUndefined();

      passedTests++;
      logTestResult('Return reader public profile', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Return reader public profile', false);
      throw error;
    }
  });

  // ============ 用户不存在 ============

  it('should return 404 for non-existent user', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000/profile');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');

      passedTests++;
      logTestResult('Return 404 for non-existent user', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Return 404 for non-existent user', false);
      throw error;
    }
  });

  // ============ 无效ID格式 ============

  it('should return 400 for invalid id format', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/abc/profile');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');

      passedTests++;
      logTestResult('Return 400 for invalid id', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Return 400 for invalid id', false);
      throw error;
    }
  });
});