// src/controllers/dbTestController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { ping } from '../dal/system.js';

export const dbTestController = async ({ env, lang }) => {
  try {
    const result = await ping(env);
    return json({
      status: 'ok',
      message: getMessage('DB_CONNECT_SUCCESS', lang),
      data: result,
    });
  } catch (error) {
    return json({
      status: 'error',
      message: error.message || 'Network connection lost.',
    }, 500);
  }
};