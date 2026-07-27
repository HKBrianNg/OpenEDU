// server/src/dal/articles.js
import { pool } from '../utils/db.js';

async function findPublished(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [articlesResult, countResult] = await Promise.all([
    pool.query(
      `SELECT a.*, u.nickname, u.avatar_url, c.name as category_name
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status = 'published'
       ORDER BY a.published_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    ),
    pool.query(
      "SELECT COUNT(*) FROM articles WHERE status = 'published'"
    )
  ]);

  return {
    articles: articlesResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    pageSize,
  };
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT a.*, u.nickname, u.avatar_url, c.name as category_name
     FROM articles a
     LEFT JOIN users u ON a.author_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByAuthor(authorId) {
  const { rows } = await pool.query(
    `SELECT a.*, c.name as category_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.author_id = $1
     ORDER BY a.updated_at DESC`,
    [authorId]
  );
  return rows;
}

async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO articles (title, content, summary, cover_image, category_id, tags, author_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.title, data.content, data.summary || '', data.coverImage || '', data.categoryId, data.tags || [], data.authorId, data.status || 'draft']
  );
  return rows[0];
}

async function update(id, data) {
  const keys = Object.keys(data);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map(k => data[k]);

  const { rows } = await pool.query(
    `UPDATE articles SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${keys.length + 1}
     RETURNING *`,
    [...values, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query(
    'DELETE FROM articles WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

async function findPending() {
  const { rows } = await pool.query(
    `SELECT a.*, u.email, u.nickname, c.name as category_name
     FROM articles a
     LEFT JOIN users u ON a.author_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = 'pending_review'
     ORDER BY a.updated_at DESC`
  );
  return rows;
}

export { findPublished, findById, findByAuthor, create, update, remove, findPending };