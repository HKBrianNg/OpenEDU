// src/dal/users.js
import { db } from '../utils/db.js';

// 根据邮箱查用户
async function findByEmail(env, email) {
  return db.selectOne(env, 'users', {
    filters: `email=eq.${encodeURIComponent(email)}`,
  });
}

// 根据昵称查用户
async function findByNickname(env, nickname) {
  return db.selectOne(env, 'users', {
    filters: `nickname=eq.${encodeURIComponent(nickname)}`,
  });
}

// 根据验证 token 查用户
async function findByVerificationToken(env, token) {
  return db.selectOne(env, 'users', {
    filters: `verification_token=eq.${encodeURIComponent(token)}`,
  });
}

// 创建用户（触发器会自动创建偏好记录）
// status: 'pending' - 注册但未验证邮箱
async function createUser(env, { email, password_hash, nickname, verification_token, verification_token_expires }) {
  return db.insert(env, 'users', {
    email,
    password_hash,
    nickname,
    role: 'user',
    status: 'pending',  // 改为 pending
    verification_token,
    verification_token_expires,
  });
}

// 验证邮箱成功，激活账号
async function verifyUserEmail(env, userId) {
  return db.update(env, 'users', `id=eq.${userId}`, {
    status: 'active',
    verification_token: null,
    verification_token_expires: null,
  });
}

// 更新用户状态（admin 操作：active / disabled / pending）
async function updateUserStatus(env, userId, status) {
  return db.update(env, 'users', `id=eq.${userId}`, { status });
}

// 更新最后登录时间
async function updateLastLogin(env, userId) {
  return db.update(env, 'users', `id=eq.${userId}`, {
    last_login_at: new Date().toISOString(),
  });
}

// 获取用户列表（仅 admin）
async function listUsers(env) {
  return db.select(env, 'users', {
    select: 'id,email,nickname,role,status,created_at',
  });
}

export { 
  findByEmail, 
  findByNickname, 
  findByVerificationToken,
  createUser, 
  verifyUserEmail,
  updateUserStatus,  // 新增
  updateLastLogin, 
  listUsers 
};