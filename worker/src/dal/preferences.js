// src/dal/preferences.js
import { db } from '../utils/db.js';

// 获取用户偏好
async function findByUserId(env, userId) {
  return db.selectOne(env, 'user_preferences', {
    filters: `user_id=eq.${userId}`,
  });
}

// 更新或插入偏好
async function upsertPreferences(env, userId, { theme, language, notifications, privacy }) {
  const existing = await findByUserId(env, userId);

  const data = {
    theme: theme || 'system',
    language: language || 'zh-CN',
    notifications: notifications || { email: true, push: true, sms: false },
    privacy: privacy || { profile_public: true, show_email: false },
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    return db.update(env, 'user_preferences', `user_id=eq.${userId}`, data);
  } else {
    return db.insert(env, 'user_preferences', {
      user_id: userId,
      ...data,
    });
  }
}

export { findByUserId, upsertPreferences };