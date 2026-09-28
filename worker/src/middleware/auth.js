// src/middleware/auth.js
import { verifyToken } from '../utils/jwt.js';
import { getMessage } from '../constants/messages.js';
import { json } from '../routes/index.js';

export async function requireAuth(request, env, { lang }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ code: 'UNAUTHORIZED', message: getMessage('UNAUTHORIZED', lang) }, 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await verifyToken(token, env.JWT_SECRET);
    return { user: payload };
  } catch (error) {
    return json({ code: 'UNAUTHORIZED', message: getMessage('UNAUTHORIZED', lang) }, 401);
  }
}

export function requireRole(...roles) {
  return async (request, env, { lang }) => {
    const auth = await requireAuth(request, env, { lang });
    if (auth.user && roles.includes(auth.user.role)) {
      return auth;
    }
    return json({ code: 'FORBIDDEN', message: getMessage('FORBIDDEN', lang) }, 403);
  };
}