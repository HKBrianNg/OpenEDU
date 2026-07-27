import '../setup.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../src/routes/auth.js';
import { logTestResult, logTestSuite, logTestSummary, cleanupTestUsers } from '../utils.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

const createdEmails = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

afterAll(async () => {
  logTestSummary(totalTests, passedTests, failedTests);
  await cleanupTestUsers(createdEmails);
});

describe('Login Tests', () => {
  const testEmail = `test_login_${Date.now()}@example.com`;
  const testPassword = 'Test123456';

  logTestSuite('Login Tests');

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });
    createdEmails.push(testEmail);
  });

  it('should fail login when email not verified', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');

      passedTests++;
      logTestResult('Fail login - email not verified', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Fail login - email not verified', false, { error: error.message });
      throw error;
    }
  });

  it('should fail login with wrong password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPassword123' });

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
        .send({ email: 'nonexistent@example.com', password: testPassword });

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
});