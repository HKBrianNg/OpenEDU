-- migrations/002_seed_root.sql
-- 用占位符，实际密码由 init-root.js 脚本用 bcrypt 生成后插入

INSERT INTO users (email, password_hash, nickname, role, status)
SELECT
  '1840764649@qq.com',
  :password_hash,        -- 由脚本替换
  'Super Admin',
  'admin',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = '1840764649@qq.com'
);