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

// 创建用户（触发器会自动创建偏好记录）
async function createUser(env, { email, password_hash, nickname }) {
  return db.insert(env, 'users', {
    email,
    password_hash,
    nickname,
    role: 'user',
    status: 'active',
  });
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

export { findByEmail, findByNickname, createUser, updateLastLogin, listUsers };