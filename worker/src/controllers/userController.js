// src/controllers/userController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { listUsers } from '../dal/users.js';

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