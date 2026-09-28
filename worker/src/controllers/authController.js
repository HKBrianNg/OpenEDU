// src/controllers/authController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { signToken } from '../utils/jwt.js';
import { findByEmail, updateLastLogin } from '../dal/users.js';

export const loginController = async ({ env, lang, body }) => {
  const { email, password } = body;

  if (!email || !password) {
    return json({ code: 'INVALID_INPUT', message: getMessage('INVALID_INPUT', lang) }, 400);
  }

  // 1. 查用户（DAL）
  const user = await findByEmail(env, email);

  if (!user) {
    return json({ code: 'INVALID_CREDENTIALS', message: getMessage('INVALID_CREDENTIALS', lang) }, 401);
  }

  // 2. 验证密码（bcryptjs）
  const bcrypt = await import('bcryptjs');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return json({ code: 'INVALID_CREDENTIALS', message: getMessage('INVALID_CREDENTIALS', lang) }, 401);
  }

  // 3. 检查状态
  if (user.status !== 'active') {
    return json({ code: 'ACCOUNT_DISABLED', message: getMessage('ACCOUNT_DISABLED', lang) }, 403);
  }

  // 4. 签发 JWT
  const token = await signToken(
    { user_id: user.id, role: user.role, email: user.email },
    env.JWT_SECRET
  );

  // 5. 更新 last_login_at（DAL）
  await updateLastLogin(env, user.id);

  return json({
    code: 'LOGIN_SUCCESS',
    message: getMessage('LOGIN_SUCCESS', lang),
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    },
  });
};