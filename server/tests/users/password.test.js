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

const TEST_EMAIL = 'reader@openedu.com';
const TEST_PASSWORD = 'Test123456';
const NEW_PASSWORD = 'NewPassword789';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let token;

afterAll(async () => {
  logTestSummary(totalTests, passedTests, failedTests);
});

describe('Change Password Tests', () => {
  logTestSuite('Change Password Tests');

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    token = loginRes.body.token;
  });

  // 测试完成后恢复原密码
  afterAll(async () => {
    if (token) {
      await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: NEW_PASSWORD, newPassword: TEST_PASSWORD });
    }
  });

  // ============ 未认证测试 ============

  it('should reject without token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/password')
        .send({ oldPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD });

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

  // ============ 输入校验测试 ============

  it('should reject empty old password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: '', newPassword: NEW_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_INPUT');

      passedTests++;
      logTestResult('Reject empty old password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject empty old password', false);
      throw error;
    }
  });

  it('should reject empty new password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: '' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_INPUT');

      passedTests++;
      logTestResult('Reject empty new password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject empty new password', false);
      throw error;
    }
  });

  it('should reject weak new password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: '123' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('WEAK_PASSWORD');

      passedTests++;
      logTestResult('Reject weak new password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject weak new password', false);
      throw error;
    }
  });

  it('should reject same password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SAME_PASSWORD');

      passedTests++;
      logTestResult('Reject same password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject same password', false);
      throw error;
    }
  });

  it('should reject wrong old password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'WrongPassword123', newPassword: NEW_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_OLD_PASSWORD');

      passedTests++;
      logTestResult('Reject wrong old password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject wrong old password', false);
      throw error;
    }
  });

  // ============ 成功修改密码测试 ============

  it('should change password successfully', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('密码修改成功');

      passedTests++;
      logTestResult('Change password successfully', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Change password successfully', false);
      throw error;
    }
  });

  it('should login with new password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: NEW_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      passedTests++;
      logTestResult('Login with new password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Login with new password', false);
      throw error;
    }
  });

  it('should reject login with old password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(401);

      passedTests++;
      logTestResult('Reject login with old password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject login with old password', false);
      throw error;
    }
  });
});