// src/controllers/profileController.js
// 用户自助资料管理：改昵称、改密码（仅限本人，requireAuth 即可，不限角色）
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { findById, findByNickname, updateUser, updatePassword } from '../dal/users.js';

// 修改自己的昵称
// PATCH /api/profile  body: { nickname }
export const updateProfileController = async ({ env, lang, authUser, body }) => {
  const userId = authUser.user_id;
  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';

  if (!nickname || nickname.length < 2) {
    return json({
      code: 'INVALID_NICKNAME',
      message: getMessage('INVALID_NICKNAME', lang),
    }, 400);
  }

  try {
    const me = await findById(env, userId);
    if (!me) {
      return json({ code: 'USER_NOT_FOUND', message: getMessage('USER_NOT_FOUND', lang) }, 404);
    }

    // 昵称唯一性（排除自己：保持原昵称也允许提交）
    if (nickname !== me.nickname) {
      const existing = await findByNickname(env, nickname);
      if (existing && existing.id !== userId) {
        return json({ code: 'NICKNAME_TAKEN', message: getMessage('NICKNAME_TAKEN', lang) }, 409);
      }
    }

    await updateUser(env, userId, { nickname });

    return json({
      code: 'PROFILE_UPDATED',
      message: getMessage('PROFILE_UPDATED', lang),
      data: { id: userId, nickname },
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 修改自己的密码
// PUT /api/profile/password  body: { oldPassword, newPassword }
export const changePasswordController = async ({ env, lang, authUser, body }) => {
  const userId = authUser.user_id;
  const { oldPassword, newPassword } = body || {};

  if (!oldPassword || !newPassword) {
    return json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    }, 400);
  }

  if (newPassword.length < 8) {
    return json({ code: 'WEAK_PASSWORD', message: getMessage('WEAK_PASSWORD', lang) }, 400);
  }

  try {
    const me = await findById(env, userId);
    if (!me) {
      return json({ code: 'USER_NOT_FOUND', message: getMessage('USER_NOT_FOUND', lang) }, 404);
    }

    // 校验旧密码
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(oldPassword, me.password_hash);
    if (!valid) {
      return json({ code: 'WRONG_OLD_PASSWORD', message: getMessage('WRONG_OLD_PASSWORD', lang) }, 401);
    }

    // 哈希并更新
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updatePassword(env, userId, passwordHash);

    return json({
      code: 'PASSWORD_CHANGED',
      message: getMessage('PASSWORD_CHANGED', lang),
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};
