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

describe('Authors List Tests', () => {
  logTestSuite('Authors List Tests');

  let readerToken;
  let authorToken;

  beforeAll(async () => {
    // 读者登录
    const readerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: READER_EMAIL, password: TEST_PASSWORD });

    readerToken = readerLogin.body.token;

    // 作者登录
    const authorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: AUTHOR_EMAIL, password: TEST_PASSWORD });

    authorToken = authorLogin.body.token;
  });

  // ============ 未认证测试 ============

  it('should reject without token', async () => {
    totalTests++;
    try {
      const res = await request(app).get('/api/users/authors');

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

  // ============ 读者访问测试 ============

  it('should allow reader to get authors list', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/authors')
        .set('Authorization', `Bearer ${readerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // 验证作者列表中包含 author@openedu.com
      const authorInList = res.body.find(u => u.email === AUTHOR_EMAIL);
      expect(authorInList).toBeDefined();
      expect(authorInList.nickname).toBe('作者测试员');
      expect(authorInList.role).toBeUndefined(); // 不返回 role 字段

      passedTests++;
      logTestResult('Allow reader to get authors list', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Allow reader to get authors list', false);
      throw error;
    }
  });

  // ============ 作者访问测试 ============

  it('should allow author to get authors list', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/authors')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // 验证作者列表中包含自己
      const selfInList = res.body.find(u => u.email === AUTHOR_EMAIL);
      expect(selfInList).toBeDefined();
      expect(selfInList.nickname).toBe('作者测试员');

      passedTests++;
      logTestResult('Allow author to get authors list', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Allow author to get authors list', false);
      throw error;
    }
  });

  // ============ 数据结构验证 ============

  it('should return correct author fields', async () => {
    totalTests++;
    try {
      const res = await request(app)
        .get('/api/users/authors')
        .set('Authorization', `Bearer ${readerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      if (res.body.length > 0) {
        const author = res.body[0];
        // 应该包含的字段
        expect(author.id).toBeDefined();
        expect(author.email).toBeDefined();
        expect(author.nickname).toBeDefined();
        expect(author.created_at).toBeDefined();

        // 不应该包含的字段
        expect(author.password_hash).toBeUndefined();
        expect(author.role).toBeUndefined();
        expect(author.status).toBeUndefined();
      }

      passedTests++;
      logTestResult('Return correct author fields', true, { status: res.status });
    } catch (error) {
      failedTests++;
      logTestResult('Return correct author fields', false);
      throw error;
    }
  });
});