// server/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { getMessage } from '../constants/messages.js';

const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const lang = req.headers['accept-language']?.split(',')[0] || 'zh-CN';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({    // ← 加上 401
      code: 'UNAUTHORIZED',
      message: getMessage('UNAUTHORIZED', lang),
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({    // ← 加上 401
        code: 'TOKEN_EXPIRED',
        message: getMessage('TOKEN_EXPIRED', lang),
      });
    }

    return res.status(401).json({      // ← 加上 401
      code: 'UNAUTHORIZED',
      message: getMessage('UNAUTHORIZED', lang),
    });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    const lang = req.headers['accept-language']?.split(',')[0] || 'zh-CN';

    if (!req.user) {
      return res.status(401).json({    // ← 加上 401
        code: 'UNAUTHORIZED',
        message: getMessage('UNAUTHORIZED', lang),
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({    // ← 加上 403
        code: 'FORBIDDEN',
        message: getMessage('FORBIDDEN', lang),
      });
    }

    next();
  };
}

export { authenticate, authorize };