// src/controllers/verifyEmailController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { findByVerificationToken, verifyUserEmail } from '../dal/users.js';

export const verifyEmailController = async ({ env, lang, token }) => {
  // 1. 校验 token 是否存在
  if (!token) {
    return json({ 
      code: 'VERIFY_FAILED', 
      message: getMessage('VERIFY_FAILED', lang) 
    }, 400);
  }

  // 2. 根据 token 查用户
  const user = await findByVerificationToken(env, token);

  if (!user) {
    return json({ 
      code: 'VERIFY_FAILED', 
      message: getMessage('VERIFY_FAILED', lang) 
    }, 400);
  }

  // 3. 检查 token 是否过期
  const now = new Date();
  const expires = new Date(user.verification_token_expires);
  
  if (expires < now) {
    return json({ 
      code: 'VERIFY_EXPIRED', 
      message: getMessage('VERIFY_EXPIRED', lang) 
    }, 400);
  }

  // 4. 检查用户状态（如果已经是 active，说明重复验证）
  if (user.status === 'active') {
    return json({ 
      code: 'ALREADY_VERIFIED', 
      message: getMessage('ALREADY_VERIFIED', lang) 
    }, 200);
  }

  // 5. 激活账号
  await verifyUserEmail(env, user.id);

  return json({
    code: 'VERIFY_SUCCESS',
    message: getMessage('VERIFY_SUCCESS', lang),
    data: {
      email: user.email,
    },
  });
};