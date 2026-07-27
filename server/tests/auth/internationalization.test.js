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

describe('Internationalization Tests', () => {
  logTestSuite('Internationalization Tests');

  it('should return Traditional Chinese message', async () => {
    totalTests++;
    try {
      const testEmail = `test_i18n_zh_${Date.now()}@example.com`;

      const res1 = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'zh-TW')
        .send({ email: testEmail, password: 'Test123456' });

      expect(res1.status).toBe(201);
      createdEmails.push(testEmail);

      const res2 = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'zh-TW')
        .send({ email: testEmail, password: 'Test123456' });

      expect(res2.body.message).toBe('該郵箱已被註冊');

      passedTests++;
      logTestResult('Traditional Chinese message', true, { message: res2.body.message });
    } catch (error) {
      failedTests++;
      logTestResult('Traditional Chinese message', false, { error: error.message });
      throw error;
    }
  });

  it('should return English message', async () => {
    totalTests++;
    try {
      const testEmail = `test_i18n_en_${Date.now()}@example.com`;

      const res1 = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'en')
        .send({ email: testEmail, password: 'Test123456' });

      expect(res1.status).toBe(201);
      createdEmails.push(testEmail);

      const res2 = await request(app)
        .post('/api/auth/register')
        .set('Accept-Language', 'en')
        .send({ email: testEmail, password: 'Test123456' });

      expect(res2.body.message).toBe('This email is already registered');

      passedTests++;
      logTestResult('English message', true, { message: res2.body.message });
    } catch (error) {
      failedTests++;
      logTestResult('English message', false, { error: error.message });
      throw error;
    }
  });

  it('should return Simplified Chinese by default', async () => {
    totalTests++;
    try {
      const testEmail = `test_i18n_zhcn_${Date.now()}@example.com`;

      const res1 = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: 'Test123456' });

      expect(res1.status).toBe(201);
      createdEmails.push(testEmail);

      const res2 = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: 'Test123456' });

      expect(res2.body.message).toBe('该邮箱已被注册');

      passedTests++;
      logTestResult('Simplified Chinese default', true, { message: res2.body.message });
    } catch (error) {
      failedTests++;
      logTestResult('Simplified Chinese default', false, { error: error.message });
      throw error;
    }
  });
});