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

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

afterAll(async () => {
  logTestSummary(totalTests, passedTests, failedTests);
});

describe('Public Users List Tests', () => {
  logTestSuite('Public Users List Tests');

  // ============ 无需登录即可访问 ============

  it('should return users list without token', async () => {
    totalTests++;
    try {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.page).toBe(1);

      // 只返回公开字段
      const user = res.body.users[0];
      expect(user.id).toBeDefined();
      expect(user.nickname).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.email).toBeUndefined();
      expect(user.status).toBeUndefined();

      passedTests++;
      logTestResult('Return users list without token', true, { status: res.status, total: res.body.total });
    } catch (error) {
      failedTests++;
      logTestResult('Return users list without token', false);
      throw error;
    }
  });

  // ============ 分页 ============

  it('should support pagination', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users?page=1&limit=2');

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

  // ============ 按角色筛选 ============

  it('should filter by role', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users?role=author');

      expect(res.status).toBe(200);
      res.body.users.forEach(user => {
        expect(user.role).toBe('author');
      });

      passedTests++;
      logTestResult('Filter by role', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Filter by role', false);
      throw error;
    }
  });

  // ============ 搜索 ============

  it('should search by nickname', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users?search=测试');

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);

      passedTests++;
      logTestResult('Search by nickname', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Search by nickname', false);
      throw error;
    }
  });
});