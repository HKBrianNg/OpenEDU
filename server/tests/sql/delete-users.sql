-- 先删偏好设置
DELETE FROM user_preferences WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test_%@example.com'
);

-- 再删用户
DELETE FROM users WHERE email LIKE 'test_%@example.com';

-- 删除除了指定邮箱之外的所有用户
DELETE FROM users WHERE email NOT IN ('admin@openedu.com');

-- 确认只剩需要的用户
SELECT id, email, status, created_at FROM users;