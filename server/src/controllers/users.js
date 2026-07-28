// server/src/controllers/users.js
import { findById, updateUserProfile } from '../dal/users.js';
import { getMessage } from '../constants/messages.js';

function getLang(req) {
  return req.headers['accept-language']?.split(',')[0] || 'zh-CN';
}

async function getProfile(req, res) {
  const lang = getLang(req);
  
  try {
    const user = await findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      });
    }

    const { password_hash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

async function updateProfile(req, res) {
  const lang = getLang(req);
  const { nickname, avatar_url } = req.body;

  // 类型校验：如果传了 nickname，必须是字符串
  if (nickname !== undefined && typeof nickname !== 'string') {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: '昵称必须是字符串',
    });
  }

  // 类型校验：如果传了 avatar_url，必须是字符串
  if (avatar_url !== undefined && typeof avatar_url !== 'string') {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: '头像URL必须是字符串',
    });
  }

  try {
    const updated = await updateUserProfile(req.user.id, { nickname, avatar_url });
    res.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

export { getProfile, updateProfile };