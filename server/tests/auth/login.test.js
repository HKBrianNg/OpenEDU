// tests/auth/login.test.js
import '../setup.js';
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../src/routes/auth.js';
import { logTestResult, logTestSuite, logTestSummary } from '../utils.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

afterAll(async () => {
  logTestSummary(totalTests, passedTests, failedTests);
});

describe('Login Tests', () => {
  logTestSuite('Login Tests');

  // ============ 失败测试 ============

  it('should fail login with wrong password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'reader@openedu.com', password: 'WrongPassword123' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');

      passedTests++;
      logTestResult('Fail login - wrong password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Fail login - wrong password', false, { error: error.message });
      throw error;
    }
  });

  it('should fail login with non-existent user', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Test123456' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');

      passedTests++;
      logTestResult('Fail login - user not found', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Fail login - user not found', false, { error: error.message });
      throw error;
    }
  });

  it('should fail login with empty input', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_INPUT');

      passedTests++;
      logTestResult('Fail login - empty input', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Fail login - empty input', false, { error: error.message });
      throw error;
    }
  });

  // ============ 成功登录测试 ============

  it('should login reader@openedu.com successfully', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'reader@openedu.com', password: 'Test123456' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');

      passedTests++;
      logTestResult('Login reader@openedu.com', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Login reader@openedu.com', false, { error: error.message });
      throw error;
    }
  });

  it('should login author@openedu.com successfully', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'author@openedu.com', password: 'Test123456' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');

      passedTests++;
      logTestResult('Login author@openedu.com', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Login author@openedu.com', false, { error: error.message });
      throw error;
    }
  });
});