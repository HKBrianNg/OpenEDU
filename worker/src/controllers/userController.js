// src/controllers/userController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { listUsers, updateUserStatus, findByEmail, findByNickname } from '../dal/users.js';

// 获取用户列表（仅 admin）
export const listUsersController = async ({ env, lang }) => {
  try {
    const users = await listUsers(env);
    
    return json({
      code: 'USERS_LIST_RETRIEVED',
      message: getMessage('USERS_LIST_RETRIEVED', lang),
      data: users,
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 更新用户状态（仅 admin，用于手动激活/禁用/挂起）
export const updateUserStatusController = async ({ env, lang, params, body }) => {
  const { id } = params;
  const { status } = body;

  // 校验状态值
  if (!['active', 'disabled', 'pending'].includes(status)) {
    return json({ 
      code: 'INVALID_STATUS', 
      message: getMessage('INVALID_STATUS', lang) 
    }, 400);
  }

  try {
    await updateUserStatus(env, id, status);
    
    return json({
      code: 'USER_STATUS_UPDATED',
      message: getMessage('USER_STATUS_UPDATED', lang),
      data: { id, status },
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 邮箱预检（第一层：前端失焦调用）
export const checkEmailController = async ({ env, lang, query }) => {
  const email = query?.email?.toLowerCase();
  if (!email) {
    return json({ 
      code: 'INVALID_INPUT', 
      message: getMessage('INVALID_INPUT', lang) 
    }, 400);
  }

  try {
    const user = await findByEmail(env, email);
    return json({
      code: 'EMAIL_CHECKED',
      message: getMessage('EMAIL_CHECKED', lang),
      data: { 
        available: !user, 
        status: user?.status 
      },
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 昵称预检（第一层：前端失焦调用）
export const checkNicknameController = async ({ env, lang, query }) => {
  const nickname = query?.nickname?.trim();
  if (!nickname) {
    return json({ 
      code: 'INVALID_INPUT', 
      message: getMessage('INVALID_INPUT', lang) 
    }, 400);
  }

  try {
    const user = await findByNickname(env, nickname);
    return json({
      code: 'NICKNAME_CHECKED',
      message: getMessage('NICKNAME_CHECKED', lang),
      data: { 
        available: !user, 
        status: user?.status 
      },
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};