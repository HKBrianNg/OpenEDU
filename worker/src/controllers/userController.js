// src/controllers/userController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { 
  listUsers, 
  findById,
  updateUserStatus, 
  updateUser,
  deleteUser,
  findByEmail, 
  findByNickname 
} from '../dal/users.js';

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

// 获取单个用户（仅 admin，编辑时回填）
export const getUserController = async ({ env, lang, params }) => {
  const { id } = params;

  try {
    const user = await findById(env, id);
    if (!user) {
      return json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      }, 404);
    }

    return json({
      code: 'USER_RETRIEVED',
      message: getMessage('USER_RETRIEVED', lang),
      data: user,
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

// 更新用户资料（仅 admin：email / nickname / role / status）
export const updateUserController = async ({ env, lang, params, body }) => {
  const { id } = params;
  const { email, nickname, role, status } = body || {};

  // 校验 role
  if (role !== undefined && !['user', 'admin'].includes(role)) {
    return json({
      code: 'INVALID_ROLE',
      message: getMessage('INVALID_ROLE', lang),
    }, 400);
  }

  // 校验 status
  if (status !== undefined && !['active', 'disabled', 'pending'].includes(status)) {
    return json({
      code: 'INVALID_STATUS',
      message: getMessage('INVALID_STATUS', lang),
    }, 400);
  }

  // 至少要有一个字段
  if (email === undefined && nickname === undefined && role === undefined && status === undefined) {
    return json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    }, 400);
  }

  try {
    // 如果改了 email，检查是否与其他用户冲突
    if (email !== undefined) {
      const existing = await findByEmail(env, email);
      if (existing && existing.id !== id) {
        return json({
          code: 'EMAIL_TAKEN',
          message: getMessage('EMAIL_TAKEN', lang),
        }, 409);
      }
    }

    // 如果改了 nickname，检查是否与其他用户冲突
    if (nickname !== undefined) {
      const existing = await findByNickname(env, nickname);
      if (existing && existing.id !== id) {
        return json({
          code: 'NICKNAME_TAKEN',
          message: getMessage('NICKNAME_TAKEN', lang),
        }, 409);
      }
    }

    await updateUser(env, id, { email, nickname, role, status });
    
    return json({
      code: 'USER_UPDATED',
      message: getMessage('USER_UPDATED', lang),
      data: { id },
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 删除用户（仅 admin，物理删除）
export const deleteUserController = async ({ env, lang, params }) => {
  const { id } = params;

  try {
    const user = await findById(env, id);
    if (!user) {
      return json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      }, 404);
    }

    // 不能删除自己（防止 admin 误删自己导致系统无管理员）
    // 这里需要传入当前登录用户 id，由路由层注入
    await deleteUser(env, id);
    
    return json({
      code: 'USER_DELETED',
      message: getMessage('USER_DELETED', lang),
      data: { id },
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