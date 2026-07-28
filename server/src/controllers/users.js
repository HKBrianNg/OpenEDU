// server/src/controllers/users.js
import bcrypt from 'bcryptjs';
import { findById, updateUserProfile, updatePassword, findAuthors, updateAvatar } from '../dal/users.js';
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

  if (nickname !== undefined && typeof nickname !== 'string') {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: '昵称必须是字符串',
    });
  }

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

// 修改密码
async function changePassword(req, res) {
  const lang = getLang(req);
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: '旧密码和新密码不能为空',
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      code: 'WEAK_PASSWORD',
      message: '新密码长度不能少于8位',
    });
  }

  if (oldPassword === newPassword) {
    return res.status(400).json({
      code: 'SAME_PASSWORD',
      message: '新密码不能与旧密码相同',
    });
  }

  try {
    const user = await findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      });
    }

    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        code: 'INVALID_OLD_PASSWORD',
        message: '旧密码不正确',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await updatePassword(req.user.id, passwordHash);

    res.json({
      message: '密码修改成功',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// 获取作者列表
async function getAuthors(req, res) {
  const lang = getLang(req);

  try {
    const authors = await findAuthors();
    res.json(authors);
  } catch (error) {
    console.error('Get authors error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// 上传头像
async function uploadAvatar(req, res) {
  const lang = getLang(req);

  if (!req.file) {
    return res.status(400).json({
      code: 'NO_FILE_UPLOADED',
      message: '请选择要上传的头像图片',
    });
  }

  try {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updated = await updateAvatar(req.user.id, avatarUrl);

    res.json({
      message: '头像上传成功',
      avatar_url: updated.avatar_url,
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

export { getProfile, updateProfile, changePassword, getAuthors, uploadAvatar };