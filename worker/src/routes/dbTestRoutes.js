// src/routes/dbTestRoutes.js
import { dbTestController } from '../controllers/dbTestController.js';

export async function dbTestRoutes(request, env, { url, lang }) {
  if (url.pathname === '/api/db-test' && request.method === 'GET') {
    return dbTestController({ env, lang });
  }
  return null;
}