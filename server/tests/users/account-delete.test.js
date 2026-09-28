import '../setup.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../src/routes/auth.js';
import usersRoutes from '../../src/routes/users.js';
import { pool } from '../../src/utils/db.js';
import { logTestResult, logTestSuite, logTestSummary } from '../utils.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let token;
let testEmail;

afterAll(async () => {
  logTestSummary(totalTests, passedTests, failedTests);
});

describe('Account Deletion Tests', () => {
  logTestSuite('Account Deletion Tests');

  beforeAll(async () => {
    // 1. 动态生成唯一测试邮箱
    testEmail = `test_${Date.now()}@openedu.com`;
    const testPassword = 'Test123456';

    // 2. 注册新账号
    await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    // 3. 绕过邮箱验证，直接将用户状态设为 active
    await pool.query(
      `UPDATE users SET email_verified = true, status = 'active' WHERE email = $1`,
      [testEmail]
    );

    // 4. 登录获取 token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    token = loginRes.body.token;
  });

  // ============ 未认证测试 ============
  it('should reject deletion without token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .delete('/api/users/account');

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

  // ============ 正常注销测试 ============
  it('should delete account successfully', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('账号已注销');

      passedTests++;
      logTestResult('Delete account successfully', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Delete account successfully', false);
      throw error;
    }
  });

  // ============ 注销后验证 ============
  it('should reject login after account deletion', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'Test123456' });

      expect(res.status).toBe(401);

      passedTests++;
      logTestResult('Reject login after deletion', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject login after deletion', false);
      throw error;
    }
  });
});