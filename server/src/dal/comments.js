// server/src/dal/comments.js
import { pool } from '../utils/db.js';

async function findByArticle(articleId) {
  const { rows } = await pool.query(
    `SELECT c.*, u.nickname, u.avatar_url
     FROM comments c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.article_id = $1 AND c.parent_id IS NULL
     ORDER BY c.created_at DESC`,
    [articleId]
  );

  // 获取每个顶级评论的回复
  const commentsWithReplies = await Promise.all(
    rows.map(async (comment) => {
      const { rows: replies } = await pool.query(
        `SELECT r.*, u.nickname, u.avatar_url
         FROM comments r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.parent_id = $1
         ORDER BY r.created_at ASC`,
        [comment.id]
      );
      return { ...comment, replies };
    })
  );

  return commentsWithReplies;
}

async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO comments (content, article_id, user_id, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.content, data.articleId, data.userId, data.parentId || null]
  );
  return rows[0];
}

async function remove(id) {
  const { rows } = await pool.query(
    'DELETE FROM comments WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

export { findByArticle, create, remove };