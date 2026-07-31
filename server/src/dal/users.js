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

// 公开用户列表（只返回公开字段）
async function findUsers(page = 1, limit = 20, filters = {}) {
  const offset = (page - 1) * limit;
  let whereClause = '1=1';
  const params = [];
  let paramIndex = 1;

  if (filters.role) {
    whereClause += ` AND u.role = $${paramIndex++}`;
    params.push(filters.role);
  }

  if (filters.search) {
    whereClause += ` AND (u.nickname ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  params.push(limit, offset);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM users u WHERE ${whereClause}`,
    params.slice(0, -2)
  );

  const { rows } = await pool.query(
    `SELECT u.id, u.nickname, u.avatar_url, u.role, u.created_at
     FROM users u
     WHERE ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );

  return {
    users: rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
  };
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

// 获取用户公开资料
// 获取用户公开资料
async function findPublicProfile(id) {
  const { rows } = await pool.query(
    `SELECT id, email, nickname, avatar_url, role, created_at
     FROM users WHERE id = $1 AND status = 'active' LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// 注销账号（软删除）
async function deactivateAccount(id) {
  const { rows } = await pool.query(
    `UPDATE users 
     SET status = 'disabled', 
         email = CONCAT('deleted_', email),
         nickname = NULL,
         avatar_url = NULL,
         password_hash = '',
         updated_at = NOW()
     WHERE id = $1 AND status != 'disabled'
     RETURNING id, status`,
    [id]
  );
  return rows[0] || null;
}

// 获取所有用户列表（分页）
async function findAllUsers(page = 1, limit = 20, filters = {}) {
  const offset = (page - 1) * limit;
  let whereClause = '1=1';
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    whereClause += ` AND u.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters.role) {
    whereClause += ` AND u.role = $${paramIndex++}`;
    params.push(filters.role);
  }

  if (filters.search) {
    whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.nickname ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  params.push(limit, offset);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM users u WHERE ${whereClause}`,
    params.slice(0, -2)
  );

  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.nickname, u.avatar_url, u.role, u.status, 
            u.email_verified, u.created_at, u.updated_at, u.last_login_at
     FROM users u
     WHERE ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );

  return {
    users: rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
  };
}

// 更新用户状态
async function updateUserStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, nickname, role, status`,
    [status, id]
  );
  return rows[0] || null;
}

// 更新用户角色
async function updateUserRole(id, role) {
  const { rows } = await pool.query(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, nickname, role, status`,
    [role, id]
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
  clearAvatar,
  findPublicProfile,
  deactivateAccount,
  updateUserStatus,
  updateUserRole,
  findUsers
};