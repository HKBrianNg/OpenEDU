// server/src/dal/users.js
import { pool } from '../utils/db.js';
import bcrypt from 'bcryptjs';

async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function createUser(email, password) {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role, status, email_verified)
     VALUES ($1, $2, 'reader', 'unverified', false)
     RETURNING *`,
    [email, passwordHash]
  );
  return rows[0];
}

async function updateUser(id, data) {
  const keys = Object.keys(data);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map(k => data[k]);

  const { rows } = await pool.query(
    `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${keys.length + 1}
     RETURNING *`,
    [...values, id]
  );
  return rows[0] || null;
}

async function getProfile(id) {
  const { rows } = await pool.query(
    `SELECT id, email, nickname, avatar_url, role, status, created_at
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findPendingUsers() {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE status = $1 ORDER BY created_at ASC',
    ['pending']
  );
  return rows;
}

async function findAllUsers() {
  const { rows } = await pool.query(
    `SELECT id, email, nickname, role, status, email_verified, created_at
     FROM users ORDER BY created_at DESC`
  );
  return rows;
}

async function updateUserProfile(id, { nickname, avatar_url }) {
  const { rows } = await pool.query(
    `UPDATE users 
     SET nickname = COALESCE($2, nickname), 
         avatar_url = COALESCE($3, avatar_url), 
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, nickname, avatar_url, role, status, created_at`,
    [id, nickname, avatar_url]
  );
  return rows[0] || null;
}

// 更新密码
async function updatePassword(id, passwordHash) {
  const { rows } = await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email`,
    [passwordHash, id]
  );
  return rows[0] || null;
}

// 获取活跃的作者列表
async function findAuthors() {
  const { rows } = await pool.query(
    `SELECT id, email, nickname, avatar_url, created_at
     FROM users WHERE role = 'author' AND status = 'active'
     ORDER BY created_at DESC`
  );
  return rows;
}

// 更新头像
async function updateAvatar(id, avatarUrl) {
  const { rows } = await pool.query(
    `UPDATE users SET avatar_url = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, nickname, avatar_url, role, status, created_at`,
    [avatarUrl, id]
  );
  return rows[0] || null;
}

// 清除头像（只更新数据库，不删除文件）
async function clearAvatar(id) {
  const { rows } = await pool.query(
    `UPDATE users SET avatar_url = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, nickname, avatar_url, role, status, created_at`,
    [id]
  );
  return rows[0] || null;
}

export { 
  findByEmail, 
  findById, 
  createUser, 
  updateUser, 
  getProfile, 
  findPendingUsers, 
  findAllUsers,
  updateUserProfile,
  updatePassword,
  findAuthors,
  updateAvatar,
  clearAvatar
};