// server/tests/auth.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../src/routes/auth.js';

// 创建一个测试用的 Express 实例
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Module - Registration', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Test123456';

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('userId');
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('should reject invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: testPassword });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_EMAIL');
  });

  it('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WEAK_PASSWORD');
  });
});

describe('Auth Module - Login', () => {
  const testEmail = `login_${Date.now()}@example.com`;
  const testPassword = 'Test123456';

  beforeAll(async () => {
    // 先注册一个用户用于登录测试
    await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });
  });

  it('should fail login when email not verified', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('should fail login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('should fail login with non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noone@example.com', password: testPassword });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('Auth Module - Protected Routes', () => {
  it('should reject GET /me without token', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should reject GET /me with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

describe('Auth Module - Internationalization', () => {
  const testEmail = `i18n_${Date.now()}@example.com`;

  it('should return Traditional Chinese message', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Accept-Language', 'zh-TW')
      .send({ email: testEmail, password: 'Test123456' });

    // 先注册成功
    expect(res.status).toBe(201);

    // 再用相同邮箱注册，触发 EMAIL_ALREADY_EXISTS
    const res2 = await request(app)
      .post('/api/auth/register')
      .set('Accept-Language', 'zh-TW')
      .send({ email: testEmail, password: 'Test123456' });

    expect(res2.body.message).toBe('該郵箱已被註冊');
  });

  it('should return English message', async () => {
    const testEmail2 = `i18n_en_${Date.now()}@example.com`;
    
    const res = await request(app)
      .post('/api/auth/register')
      .set('Accept-Language', 'en')
      .send({ email: testEmail2, password: 'Test123456' });

    expect(res.status).toBe(201);

    const res2 = await request(app)
      .post('/api/auth/register')
      .set('Accept-Language', 'en')
      .send({ email: testEmail2, password: 'Test123456' });

    expect(res2.body.message).toBe('This email is already registered');
  });
});