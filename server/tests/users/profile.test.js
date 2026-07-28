// tests/users/profile.test.js
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
const AUTHOR_EMAIL = 'author@openedu.com';
const TEST_PASSWORD = 'Test123456';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

afterAll(async () => {
  logTestSummary(totalTests, passedTests, failedTests);
});

describe('User Profile Tests', () => {
  logTestSuite('User Profile Tests');

  let readerToken;
  let authorToken;

  beforeAll(async () => {
    // 读者登录
    const readerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: READER_EMAIL, password: TEST_PASSWORD });

    if (readerLogin.status !== 200) {
      throw new Error(`Reader login failed: ${readerLogin.status}`);
    }
    readerToken = readerLogin.body.token;

    // 作者登录
    const authorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: AUTHOR_EMAIL, password: TEST_PASSWORD });

    if (authorLogin.status !== 200) {
      throw new Error(`Author login failed: ${authorLogin.status}`);
    }
    authorToken = authorLogin.body.token;
  });

  // ============ 未认证测试 ============

  it('should reject GET /profile without token', async () => {
    totalTests++;
    try {
      const res = await request(app).get('/api/users/profile');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');

      passedTests++;
      logTestResult('Reject GET /profile without token', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject GET /profile without token', false);
      throw error;
    }
  });

  it('should reject PUT /profile without token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/profile')
        .send({ nickname: 'New Name' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');

      passedTests++;
      logTestResult('Reject PUT /profile without token', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject PUT /profile without token', false);
      throw error;
    }
  });

  it('should reject PUT /profile with invalid token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer fake-token')
        .send({ nickname: 'New Name' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');

      passedTests++;
      logTestResult('Reject PUT /profile with invalid token', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject PUT /profile with invalid token', false);
      throw error;
    }
  });

  // ============ 读者测试 ============

  it('should get reader profile with valid token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${readerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(READER_EMAIL);
      expect(res.body.nickname).toBe('读者测试员');
      expect(res.body.role).toBe('reader');
      expect(res.body.id).toBeDefined();
      expect(res.body.password_hash).toBeUndefined();

      passedTests++;
      logTestResult('Get reader profile', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Get reader profile', false);
      throw error;
    }
  });

  it('should update reader nickname', async () => {
    totalTests++;
    try {
      const newNickname = 'Reader Updated';

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${readerToken}`)
        .send({ nickname: newNickname });

      expect(res.status).toBe(200);
      expect(res.body.nickname).toBe(newNickname);

      passedTests++;
      logTestResult('Update reader nickname', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Update reader nickname', false);
      throw error;
    }
  });

  it('should restore reader nickname', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${readerToken}`)
        .send({ nickname: '读者测试员' });

      expect(res.status).toBe(200);
      expect(res.body.nickname).toBe('读者测试员');

      passedTests++;
      logTestResult('Restore reader nickname', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Restore reader nickname', false);
      throw error;
    }
  });

  // ============ 作者测试 ============

  it('should get author profile with valid token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(AUTHOR_EMAIL);
      expect(res.body.nickname).toBe('作者测试员');
      expect(res.body.role).toBe('author');
      expect(res.body.id).toBeDefined();
      expect(res.body.password_hash).toBeUndefined();

      passedTests++;
      logTestResult('Get author profile', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Get author profile', false);
      throw error;
    }
  });

  it('should update author nickname', async () => {
    totalTests++;
    try {
      const newNickname = 'Author Updated';

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ nickname: newNickname });

      expect(res.status).toBe(200);
      expect(res.body.nickname).toBe(newNickname);

      passedTests++;
      logTestResult('Update author nickname', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Update author nickname', false);
      throw error;
    }
  });

  it('should restore author nickname', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ nickname: '作者测试员' });

      expect(res.status).toBe(200);
      expect(res.body.nickname).toBe('作者测试员');

      passedTests++;
      logTestResult('Restore author nickname', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Restore author nickname', false);
      throw error;
    }
  });

  // ============ 公共测试 ============

  it('should reject invalid nickname type', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${readerToken}`)
        .send({ nickname: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_INPUT');

      passedTests++;
      logTestResult('Reject invalid nickname type', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject invalid nickname type', false);
      throw error;
    }
  });

  it('should reject GET /profile with expired token format', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');

      expect(res.status).toBe(401);

      passedTests++;
      logTestResult('Reject GET /profile with expired token', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject GET /profile with expired token', false);
      throw error;
    }
  });
});