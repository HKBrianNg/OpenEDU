// src/dal/learningProgress.js
import { db } from '../utils/db.js';

// 获取用户所有学习进度
async function getUserProgress(env, userId) {
  return db.select(env, 'learning_progress', {
    select: '*',
    filters: `user_id=eq.${userId}&course_name=eq.EnglishWord`,
    order: 'last_review_at.desc',
  });
}

// 获取用户某个章节的学习进度
async function getChapterProgress(env, userId, chapterName) {
  return db.select(env, 'learning_progress', {
    select: '*',
    filters: `user_id=eq.${userId}&course_name=eq.EnglishWord&chapter_name=eq.${encodeURIComponent(chapterName)}`,
  });
}

// 获取用户某个章节、分组的学习进度
async function getGroupProgress(env, userId, chapterName, groupName) {
  return db.select(env, 'learning_progress', {
    select: '*',
    filters: `user_id=eq.${userId}&course_name=eq.EnglishWord&chapter_name=eq.${encodeURIComponent(chapterName)}&group_name=eq.${encodeURIComponent(groupName)}`,
  });
}

// 获取单个单词的学习状态
async function getWordProgress(env, userId, chapterName, groupName, contentEn) {
  return db.selectOne(env, 'learning_progress', {
    select: '*',
    filters: `user_id=eq.${userId}&course_name=eq.EnglishWord&chapter_name=eq.${encodeURIComponent(chapterName)}&group_name=eq.${encodeURIComponent(groupName)}&content_en=eq.${encodeURIComponent(contentEn)}`,
  });
}

// 更新单词状态（learning / mastered）
// 存在则更新，不存在则插入
async function upsertWordProgress(env, { userId, chapterName, groupName, contentEn, contentZh, status }) {
  const existing = await getWordProgress(env, userId, chapterName, groupName, contentEn);

  if (existing) {
    return db.update(
      env,
      'learning_progress',
      `user_id=eq.${userId}&course_name=eq.EnglishWord&chapter_name=eq.${encodeURIComponent(chapterName)}&group_name=eq.${encodeURIComponent(groupName)}&content_en=eq.${encodeURIComponent(contentEn)}`,
      {
        status,
        last_review_at: new Date().toISOString(),
      }
    );
  }

  return db.insert(env, 'learning_progress', {
    user_id: userId,
    course_name: 'EnglishWord',
    chapter_name: chapterName,
    group_name: groupName,
    content_en: contentEn,
    content_zh: contentZh,
    status,
    last_review_at: new Date().toISOString(),
  });
}

// 删除单词进度（回到 pending）
async function deleteWordProgress(env, userId, chapterName, groupName, contentEn) {
  return db.delete(
    env,
    'learning_progress',
    `user_id=eq.${userId}&course_name=eq.EnglishWord&chapter_name=eq.${encodeURIComponent(chapterName)}&group_name=eq.${encodeURIComponent(groupName)}&content_en=eq.${encodeURIComponent(contentEn)}`
  );
}

// 获取学习统计（学习中 / 已学会）
async function getProgressStats(env, userId) {
  const progress = await getUserProgress(env, userId);
  
  const stats = {
    learning: 0,
    mastered: 0,
  };
  
  progress.forEach(item => {
    if (item.status === 'learning') stats.learning++;
    if (item.status === 'mastered') stats.mastered++;
  });
  
  return stats;
}

export {
  getUserProgress,
  getChapterProgress,
  getGroupProgress,
  getWordProgress,
  upsertWordProgress,
  deleteWordProgress,
  getProgressStats,
};