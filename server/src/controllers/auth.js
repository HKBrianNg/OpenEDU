// server/src/controllers/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { findByEmail, createUser, updateUser, getProfile } from '../dal/users.js';
import { createLog } from '../dal/audit.js';
import { pool } from '../utils/db.js';
import { generateCode, setCode, verifyCode } from '../utils/verification.js';
import { sendVerificationCode } from '../utils/email.js';
import { getMessage } from '../constants/messages.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function getLang(req) {
  return req.headers['accept-language']?.split(',')[0] || 'zh-CN';
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, status: user.status },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
async function register(req, res) {
  const lang = getLang(req);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      code: 'INVALID_EMAIL',
      message: getMessage('INVALID_EMAIL', lang),
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      code: 'WEAK_PASSWORD',
      message: getMessage('WEAK_PASSWORD', lang),
    });
  }

  try {
    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        code: 'EMAIL_ALREADY_EXISTS',
        message: getMessage('EMAIL_ALREADY_EXISTS', lang),
      });
    }

    const newUser = await createUser(email, password);

    await pool.query(
      `INSERT INTO user_preferences (user_id, language) VALUES ($1, $2)`,
      [newUser.id, lang]
    );

    const code = generateCode();
    setCode(email, code);
    await sendVerificationCode(email, code).catch(() => {});

    await createLog({
      userId: newUser.id,
      action: 'user.register',
      entityType: 'users',
      entityId: newUser.id,
      metadata: { email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      message: getMessage('REGISTER_SUCCESS', lang),
      userId: newUser.id,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// POST /api/auth/verify-email
async function verifyEmail(req, res) {
  const lang = getLang(req);
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    });
  }

  const result = verifyCode(email, code);

  if (!result.valid) {
    const messageMap = {
      'CODE_NOT_FOUND': getMessage('CODE_NOT_FOUND', lang),
      'CODE_EXPIRED': getMessage('CODE_EXPIRED', lang),
      'CODE_INCORRECT': getMessage('CODE_INCORRECT', lang),
      'TOO_MANY_ATTEMPTS': getMessage('TOO_MANY_ATTEMPTS', lang),
    };

    return res.status(400).json({
      code: result.reason,
      message: messageMap[result.reason] || getMessage('CODE_INVALID', lang),
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users SET email_verified = true, status = 'pending'
       WHERE email = $1 RETURNING *`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      });
    }

    await createLog({
      userId: rows[0].id,
      action: 'user.verify_email',
      entityType: 'users',
      entityId: rows[0].id,
      metadata: { email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: getMessage('VERIFY_SUCCESS', lang),
      needApproval: true,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// POST /api/auth/resend-verification
async function resendVerification(req, res) {
  const lang = getLang(req);
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email_verified FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      });
    }

    if (rows[0].email_verified) {
      return res.status(400).json({
        code: 'ALREADY_VERIFIED',
        message: getMessage('ALREADY_VERIFIED', lang),
      });
    }

    const code = generateCode();
    setCode(email, code);
    await sendVerificationCode(email, code);

    res.json({
      message: getMessage('VERIFICATION_SENT', lang),
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const lang = getLang(req);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    });
  }

  try {
    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: getMessage('INVALID_CREDENTIALS', lang),
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: getMessage('INVALID_CREDENTIALS', lang),
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: getMessage('EMAIL_NOT_VERIFIED', lang),
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: getMessage('ACCOUNT_PENDING_APPROVAL', lang),
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        code: 'ACCOUNT_REJECTED',
        message: `${getMessage('ACCOUNT_REJECTED', lang)}${user.rejected_reason ? ': ' + user.rejected_reason : ''}`,
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        code: 'ACCOUNT_DISABLED',
        message: getMessage('ACCOUNT_DISABLED', lang),
      });
    }

    await updateUser(user.id, { last_login_at: new Date().toISOString() });

    const token = generateToken(user);

    await createLog({
      userId: user.id,
      action: 'user.login',
      entityType: 'users',
      entityId: user.id,
      metadata: { email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const { password_hash, ...userInfo } = user;

    res.json({
      message: getMessage('LOGIN_SUCCESS', lang),
      token,
      user: userInfo,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  const lang = getLang(req);
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.json({
        message: getMessage('PASSWORD_RESET_SENT', lang),
      });
    }

    const code = generateCode();
    setCode(`reset:${email}`, code);

    res.json({
      message: getMessage('PASSWORD_RESET_SENT', lang),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  const lang = getLang(req);
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: getMessage('INVALID_INPUT', lang),
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      code: 'WEAK_PASSWORD',
      message: getMessage('WEAK_PASSWORD', lang),
    });
  }

  const result = verifyCode(`reset:${email}`, code);

  if (!result.valid) {
    return res.status(400).json({
      code: result.reason,
      message: getMessage('CODE_INVALID', lang),
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const { rows } = await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id`,
      [passwordHash, email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      });
    }

    await createLog({
      userId: rows[0].id,
      action: 'user.reset_password',
      entityType: 'users',
      entityId: rows[0].id,
      metadata: {},
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: getMessage('RESET_SUCCESS', lang),
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  const lang = getLang(req);

  try {
    const user = await getProfile(req.user.id);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: getMessage('USER_NOT_FOUND', lang),
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: getMessage('INTERNAL_ERROR', lang),
    });
  }
}

export { register, verifyEmail, resendVerification, login, forgotPassword, resetPassword, getMe };