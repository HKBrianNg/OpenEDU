import '../setup.js';
import { describe, it, expect, afterAll } from 'vitest';
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

describe('Registration Tests', () => {
  const testEmail = `test_reg_${Date.now()}@example.com`;
  const testPassword = 'Test123456';

  logTestSuite('Registration Tests');

  it('should register a new user', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('userId');

      createdEmails.push(testEmail);
      passedTests++;
      logTestResult('Register new user', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Register new user', false, { error: error.message });
      throw error;
    }
  });

  it('should reject duplicate email', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');

      passedTests++;
      logTestResult('Reject duplicate email', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject duplicate email', false, { error: error.message });
      throw error;
    }
  });

  it('should reject invalid email format', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: testPassword });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_EMAIL');

      passedTests++;
      logTestResult('Reject invalid email format', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject invalid email format', false, { error: error.message });
      throw error;
    }
  });

  it('should reject weak password', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'weak@example.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('WEAK_PASSWORD');

      passedTests++;
      logTestResult('Reject weak password', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject weak password', false, { error: error.message });
      throw error;
    }
  });

  it('should reject empty input', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_INPUT');

      passedTests++;
      logTestResult('Reject empty input', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject empty input', false, { error: error.message });
      throw error;
    }
  });
});