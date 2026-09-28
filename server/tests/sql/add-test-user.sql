-- 读者测试员
INSERT INTO users (email, password_hash, nickname, role, status, email_verified)
VALUES (
  'reader@openedu.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  '读者测试员',
  'reader',
  'active',
  true
)
ON CONFLICT (email) DO NOTHING;

-- 作者测试员
INSERT INTO users (email, password_hash, nickname, role, status, email_verified)
VALUES (
  'author@openedu.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  '作者测试员',
  'author',
  'active',
  true
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_preferences (user_id, language, theme)
SELECT id, 'zh-CN', 'light' FROM users WHERE email = 'reader@openedu.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_preferences (user_id, language, theme)
SELECT id, 'zh-CN', 'light' FROM users WHERE email = 'author@openedu.com'
ON CONFLICT (user_id) DO NOTHING;