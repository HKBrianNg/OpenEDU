// src/controllers/registerController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { signToken } from '../utils/jwt.js';
import { findByEmail, findByNickname, createUser } from '../dal/users.js';

export const registerController = async ({ env, lang, body }) => {
  const { email, password, nickname } = body;

  // 1. 基础校验
  if (!email || !password || !nickname) {
    return json({ code: 'INVALID_INPUT', message: getMessage('REGISTER_REQUIRED_FIELDS', lang) }, 400);
  }

  // 2. 邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return json({ code: 'INVALID_EMAIL', message: getMessage('INVALID_EMAIL', lang) }, 400);
  }

  // 3. 密码强度
  if (password.length < 8) {
    return json({ code: 'WEAK_PASSWORD', message: getMessage('WEAK_PASSWORD', lang) }, 400);
  }

  // 4. 邮箱唯一性
  const existingEmail = await findByEmail(env, email.toLowerCase());
  if (existingEmail) {
    return json({ code: 'EMAIL_EXISTS', message: getMessage('EMAIL_EXISTS', lang) }, 409);
  }

  // 5. 昵称唯一性
  const existingNickname = await findByNickname(env, nickname);
  if (existingNickname) {
    return json({ code: 'NICKNAME_EXISTS', message: getMessage('NICKNAME_EXISTS', lang) }, 409);
  }

  // 6. 密码哈希（bcryptjs）
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 10);

  // 7. 创建用户（触发器自动创建偏好）
  const newUser = await createUser(env, {
    email: email.toLowerCase(),
    password_hash: passwordHash,
    nickname,
  });

  // 8. 签发 JWT
  const token = await signToken(
    { user_id: newUser[0].id, role: 'user', email: newUser[0].email },
    env.JWT_SECRET
  );

  return json({
    code: 'REGISTER_SUCCESS',
    message: getMessage('REGISTER_SUCCESS', lang),
    data: {
      token,
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        nickname: newUser[0].nickname,
        role: 'user',
      },
    },
  }, 201);
};