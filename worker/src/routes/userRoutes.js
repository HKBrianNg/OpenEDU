// src/routes/userRoutes.js
import { requireRole } from '../middleware/auth.js';
import { listUsersController } from '../controllers/userController.js';

export async function userRoutes(request, env, { url, lang }) {
  if (url.pathname === '/api/users' && request.method === 'GET') {
    const auth = await requireRole('admin')(request, env, { lang });
    if (auth.user) {
      return listUsersController({ env, lang });
    }
    return auth;
  }
  return null;
}