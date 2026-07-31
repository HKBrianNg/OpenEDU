// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { getMessage } from '../constants/messages.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Token 黑名单（内存存储，生产环境建议用 Redis）
const tokenBlacklist = new Set();

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const lang = req.headers['accept-language']?.split(',')[0] || 'zh-CN';
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: getMessage('UNAUTHORIZED', lang),
    });
  }

  const token = authHeader.split(' ')[1];

  // 检查 Token 是否在黑名单中
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: getMessage('UNAUTHORIZED', lang),
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 'TOKEN_EXPIRED',
        message: getMessage('TOKEN_EXPIRED', lang),
      });
    }

    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: getMessage('UNAUTHORIZED', lang),
    });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    const lang = req.headers['accept-language']?.split(',')[0] || 'zh-CN';

    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: getMessage('UNAUTHORIZED', lang),
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: getMessage('FORBIDDEN', lang),
      });
    }

    next();
  };
}

// 将 Token 加入黑名单
function addToBlacklist(token) {
  tokenBlacklist.add(token);
}

// 从黑名单中移除 Token（用于测试恢复等场景）
function removeFromBlacklist(token) {
  tokenBlacklist.delete(token);
}

// 清空黑名单（用于测试重置）
function clearBlacklist() {
  tokenBlacklist.clear();
}

export { authenticate, authorize, addToBlacklist, removeFromBlacklist, clearBlacklist };