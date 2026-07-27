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

describe('Protected Routes Tests', () => {
  logTestSuite('Protected Routes Tests');

  it('should reject GET /me without token', async () => {
    totalTests++;
    try {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');

      passedTests++;
      logTestResult('Reject /me without token', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject /me without token', false, { error: error.message });
      throw error;
    }
  });

  it('should reject GET /me with invalid token', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer this-is-a-fake-token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');

      passedTests++;
      logTestResult('Reject /me with invalid token', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject /me with invalid token', false, { error: error.message });
      throw error;
    }
  });

  it('should reject GET /me with expired token format', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');

      expect(res.status).toBe(401);

      passedTests++;
      logTestResult('Reject /me with expired/invalid token', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Reject /me with expired/invalid token', false, { error: error.message });
      throw error;
    }
  });
});