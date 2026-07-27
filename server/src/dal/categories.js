// server/src/dal/categories.js
import { pool } from '../utils/db.js';

async function findAll() {
  const { rows } = await pool.query(
    'SELECT * FROM categories ORDER BY sort_order ASC'
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM categories WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findBySlug(slug) {
  const { rows } = await pool.query(
    'SELECT * FROM categories WHERE slug = $1 LIMIT 1',
    [slug]
  );
  return rows[0] || null;
}

async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO categories (name, slug, description, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.slug, data.description || '', data.sortOrder || 0]
  );
  return rows[0];
}

async function update(id, data) {
  const keys = Object.keys(data);
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map(k => data[k]);

  const { rows } = await pool.query(
    `UPDATE categories SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${keys.length + 1}
     RETURNING *`,
    [...values, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query(
    'DELETE FROM categories WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

export { findAll, findById, findBySlug, create, update, remove };