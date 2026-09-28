import '../setup.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../src/routes/auth.js';
import adminRoutes from '../../src/routes/admin.js';
import { pool } from '../../src/utils/db.js';
import { logTestResult, logTestSuite, logTestSummary } from '../utils.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const ADMIN_EMAIL = 'admin@openedu.com';
const ADMIN_PASSWORD = 'Test123456';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let adminToken;
let tempUserId;
let readerEmail;

afterAll(async () => {
  await pool.end();
  logTestSummary(totalTests, passedTests, failedTests);
});

describe('Admin Users Management Tests', () => {
  logTestSuite('Admin Users Management Tests');

  beforeAll(async () => {
    // 1. 管理员登录
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    adminToken = loginRes.body.token;

    // 2. 创建临时测试账号
    const testEmail = `admin_test_${Date.now()}@openedu.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'Test123456' });

    // 3. 激活测试账号
    const result = await pool.query(
      `UPDATE users SET email_verified = true, status = 'active' WHERE email = $1 RETURNING id`,
      [testEmail]
    );
    tempUserId = result.rows[0].id;

    // 4. 创建并激活 reader 账号用于权限测试
    readerEmail = `reader_test_${Date.now()}@openedu.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email: readerEmail, password: 'Test123456' });

    await pool.query(
      `UPDATE users SET email_verified = true, status = 'active' WHERE email = $1`,
      [readerEmail]
    );
  }, 30000);

  // ============ 权限测试 ============

  it('should reject without token', async () => {
    totalTests++;
    try {
      const res = await request(app).get('/api/admin/users');

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

  it('should reject non-admin users', async () => {
    totalTests++;
    try {
      const readerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: readerEmail, password: 'Test123456' });

      const readerToken = readerLogin.body.token;

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${readerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');

      passedTests++;
      logTestResult('Reject non-admin users', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject non-admin users', false);
      throw error;
    }
  });

  // ============ 获取用户列表 ============

  it('should return users list', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.page).toBe(1);
      expect(res.body.message).toBe('获取用户列表成功');

      passedTests++;
      logTestResult('Return users list', true, { status: res.status, total: res.body.total });
    } catch (error) {
      failedTests++;
      logTestResult('Return users list', false);
      throw error;
    }
  });

  it('should support pagination', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/admin/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeLessThanOrEqual(2);
      expect(res.body.limit).toBe(2);

      passedTests++;
      logTestResult('Support pagination', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Support pagination', false);
      throw error;
    }
  });

  it('should filter by status', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/admin/users?status=active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.users.forEach(user => {
        expect(user.status).toBe('active');
      });

      passedTests++;
      logTestResult('Filter by status', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Filter by status', false);
      throw error;
    }
  });

  it('should search by email or nickname', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/admin/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);

      passedTests++;
      logTestResult('Search by email or nickname', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Search by email or nickname', false);
      throw error;
    }
  });

  // ============ 修改用户状态 ============

  it('should update user status', async () => {
    totalTests++;
    try {
      // 改为 disabled
      const res1 = await request(app)
        .put(`/api/admin/users/${tempUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' });

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('disabled');

      // 改回 active
      const res2 = await request(app)
        .put(`/api/admin/users/${tempUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('active');

      passedTests++;
      logTestResult('Update user status', true, { status: res1.status });
    } catch (error) {
      failedTests++;
      logTestResult('Update user status', false);
      throw error;
    }
  });

  // ============ 修改用户角色 ============

  it('should update user role', async () => {
    totalTests++;
    try {
      // 改为 author
      const res1 = await request(app)
        .put(`/api/admin/users/${tempUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'author' });

      expect(res1.status).toBe(200);
      expect(res1.body.role).toBe('author');

      // 改回 reader
      const res2 = await request(app)
        .put(`/api/admin/users/${tempUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'reader' });

      expect(res2.status).toBe(200);
      expect(res2.body.role).toBe('reader');

      passedTests++;
      logTestResult('Update user role', true, { status: res1.status });
    } catch (error) {
      failedTests++;
      logTestResult('Update user role', false);
      throw error;
    }
  });

  // ============ 无效输入 ============

  it('should reject invalid status', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put(`/api/admin/users/${tempUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_STATUS');

      passedTests++;
      logTestResult('Reject invalid status', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject invalid status', false);
      throw error;
    }
  });

  it('should reject invalid role', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put(`/api/admin/users/${tempUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'super_admin' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ROLE');

      passedTests++;
      logTestResult('Reject invalid role', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject invalid role', false);
      throw error;
    }
  });

  // ============ 用户不存在 ============

  it('should return 404 for non-existent user status update', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/admin/users/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' });

      expect(res.status).toBe(404);

      passedTests++;
      logTestResult('Return 404 for non-existent user status update', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Return 404 for non-existent user status update', false);
      throw error;
    }
  });

  it('should return 404 for non-existent user role update', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .put('/api/admin/users/00000000-0000-0000-0000-000000000000/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'author' });

      expect(res.status).toBe(404);

      passedTests++;
      logTestResult('Return 404 for non-existent user role update', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Return 404 for non-existent user role update', false);
      throw error;
    }
  });
});