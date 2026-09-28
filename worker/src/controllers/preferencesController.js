// src/controllers/preferencesController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { findByUserId, upsertPreferences } from '../dal/preferences.js';

// GET - 获取偏好
export const getPreferencesController = async ({ env, lang, user }) => {
  try {
    const preferences = await findByUserId(env, user.user_id);

    const data = preferences || {
      theme: 'system',
      language: 'zh-CN',
      notifications: { email: true, push: true, sms: false },
      privacy: { profile_public: true, show_email: false },
    };

    return json({
      code: 'PREFERENCES_RETRIEVED',
      message: getMessage('PREFERENCES_RETRIEVED', lang),
      data,
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// PATCH - 更新偏好
export const updatePreferencesController = async ({ env, lang, user, body }) => {
  try {
    const { theme, language, notifications, privacy } = body;

    const data = await upsertPreferences(env, user.user_id, {
      theme,
      language,
      notifications,
      privacy,
    });

    return json({
      code: 'PREFERENCES_UPDATED',
      message: getMessage('PREFERENCES_UPDATED', lang),
      data,
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};