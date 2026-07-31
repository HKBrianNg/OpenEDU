// server/src/controllers/admin.js
import { findAllUsers, updateUserStatus, updateUserRole } from '../dal/users.js';
import { getMessage } from '../constants/messages.js';

function getLang(req) {
  return req.headers['accept-language']?.split(',')[0] || 'zh-CN';
}

// 获取所有用户列表
async function getUsers(req, res) {
  const lang = getLang(req);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filters = {
    status: req.query.status,
    role: req.query.role,
    search: req.query.search,
  };

  try {
    const result = await findAllUsers(page, limit, filters);
    res.json({
      ...result,
      message: getMessage('USERS_LIST_RETRIEVED', lang),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// 修改用户状态
async function setUserStatus(req, res) {
  const lang = getLang(req);
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['active', 'rejected', 'disabled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      code: 'INVALID_STATUS',
      message: getMessage('INVALID_STATUS', lang),
    });
  }

  if (id === req.user.id) {
    return res.status(400).json({
      code: 'CANNOT_MODIFY_SELF',
      message: getMessage('CANNOT_MODIFY_SELF', lang),
    });
  }

  try {
    const user = await updateUserStatus(id, status);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      });
    }

    res.json({
      ...user,
      message: getMessage('USER_STATUS_UPDATED', lang),
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// 修改用户角色
async function setUserRole(req, res) {
  const lang = getLang(req);
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['reader', 'author', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      code: 'INVALID_ROLE',
      message: getMessage('INVALID_ROLE', lang),
    });
  }

  if (id === req.user.id) {
    return res.status(400).json({
      code: 'CANNOT_MODIFY_SELF',
      message: getMessage('CANNOT_MODIFY_SELF', lang),
    });
  }

  try {
    const user = await updateUserRole(id, role);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      });
    }

    res.json({
      ...user,
      message: getMessage('USER_ROLE_UPDATED', lang),
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

export { getUsers, setUserStatus, setUserRole };