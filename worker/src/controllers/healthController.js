// src/controllers/healthController.js
import { json } from '../routes/index.js';

export const healthController = async ({ lang }) => {
  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};