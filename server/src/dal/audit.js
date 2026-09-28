// server/src/dal/audit.js
import { pool } from '../utils/db.js';

async function createLog({ userId, action, entityType, entityId, metadata, ipAddress, userAgent }) {
  const { rows } = await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, action, entityType, entityId, JSON.stringify(metadata || {}), ipAddress || '', userAgent || '']
  );
  return rows[0];
}

async function queryLogs({ action, userId, dateRange, page = 1, pageSize = 50 }) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (action) {
    conditions.push(`action = $${paramIndex++}`);
    values.push(action);
  }
  if (userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(userId);
  }
  if (dateRange === 'today') {
    conditions.push(`created_at >= CURRENT_DATE`);
  } else if (dateRange === '7days') {
    conditions.push(`created_at >= NOW() - INTERVAL '7 days'`);
  } else if (dateRange === '30days') {
    conditions.push(`created_at >= NOW() - INTERVAL '30 days'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const [logsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT al.*, u.email, u.nickname
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, pageSize, offset]
    ),
    pool.query(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      values
    )
  ]);

  return {
    logs: logsResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    pageSize,
  };
}

export { createLog, queryLogs };