// src/dal/users.js
import { db } from '../utils/db.js';

// 根据邮箱查用户
async function findByEmail(env, email) {
  return db.selectOne(env, 'users', {
    filters: `email=eq.${encodeURIComponent(email)}`,
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

export { findByEmail, updateLastLogin, listUsers };