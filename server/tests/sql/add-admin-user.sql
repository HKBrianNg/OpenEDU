-- 1. 创建管理员账号
-- 把下面的 '你生成的哈希' 替换成刚才复制的哈希
INSERT INTO users (email, password_hash, nickname, role, status, email_verified, created_at, updated_at)
VALUES (
  'admin@openedu.com',
  '$2b$10$CmSBBab9DaFNaNnV36ORVeWiNwPiFQsvb.dTU7mOHR8ZCXF2TRL4G',
  '管理员',
  'admin',
  'active',
  true,
  NOW(),
  NOW()
);

-- 2. 创建偏好设置
INSERT INTO user_preferences (user_id, language)
VALUES (
  (SELECT id FROM users WHERE email = 'admin@openedu.com'),
  'zh-CN'
);

-- 3. 验证
SELECT id, email, nickname, role, status, email_verified, created_at 
FROM users 
WHERE email = 'admin@openedu.com';