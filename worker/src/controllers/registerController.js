// src/controllers/registerController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { findByEmail, findByNickname, createUser } from '../dal/users.js';
import { sendVerificationEmail } from '../utils/email.js';

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

  // 7. 生成验证 token（24小时有效）
  const verificationToken = crypto.randomUUID();
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // 8. 创建用户（pending 状态，触发器自动创建偏好）
  const newUser = await createUser(env, {
    email: email.toLowerCase(),
    password_hash: passwordHash,
    nickname,
    verification_token: verificationToken,
    verification_token_expires: verificationTokenExpires,
  });

  // 9. 发送验证邮件
  const emailResult = await sendVerificationEmail({
    env,
    email: email.toLowerCase(),
    token: verificationToken,
    lang,
  });

  if (!emailResult.success) {
    console.error('Email send failed:', emailResult.error);
    // 注册成功但邮件发送失败，返回提示
    return json({
      code: 'REGISTER_SUCCESS',
      message: getMessage('REGISTER_SUCCESS', lang),
      data: { email: email.toLowerCase(), emailSent: false },
    }, 201);
  }

  // 10. 返回成功（不自动登录）
  return json({
    code: 'REGISTER_SUCCESS',
    message: getMessage('REGISTER_SUCCESS', lang),
    data: { email: email.toLowerCase(), emailSent: true },
  }, 201);
};