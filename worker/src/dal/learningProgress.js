// src/dal/learningProgress.js
import { db } from '../utils/db.js';

// 单条过滤：在 (user, course, chapter, group, word) 维度唯一定位一条记录
function wordFilter(userId, { courseName, chapterName, groupName, contentEn }) {
  const parts = [`user_id=eq.${userId}`];
  if (courseName !== undefined && courseName !== null) {
    parts.push(`course_name=eq.${encodeURIComponent(courseName)}`);
  }
  if (chapterName !== undefined && chapterName !== null) {
    parts.push(`chapter_name=eq.${encodeURIComponent(chapterName)}`);
  }
  if (groupName !== undefined && groupName !== null) {
    parts.push(`group_name=eq.${encodeURIComponent(groupName)}`);
  }
  if (contentEn !== undefined && contentEn !== null) {
    parts.push(`content_en=eq.${encodeURIComponent(contentEn)}`);
  }
  return parts.join('&');
}

// 获取用户所有学习进度（不限 course，由客户端按 entry.course 本地过滤）
async function getUserProgress(env, userId) {
  return db.select(env, 'learning_progress', {
    select: '*',
    filters: `user_id=eq.${userId}`,
    order: 'last_review_at.desc',
  });
}

// 获取用户某门课某章节的学习进度
async function getChapterProgress(env, userId, courseName, chapterName) {
  return db.select(env, 'learning_progress', {
    select: '*',
    filters: wordFilter(userId, { courseName, chapterName }),
  });
}

// 获取用户某门课某章节、分组的学习进度
async function getGroupProgress(env, userId, courseName, chapterName, groupName) {
  return db.select(env, 'learning_progress', {
    select: '*',
    filters: wordFilter(userId, { courseName, chapterName, groupName }),
  });
}

// 获取单个单词的学习状态
async function getWordProgress(env, userId, courseName, chapterName, groupName, contentEn) {
  return db.selectOne(env, 'learning_progress', {
    select: '*',
    filters: wordFilter(userId, { courseName, chapterName, groupName, contentEn }),
  });
}

// 更新单词状态（learning / mastered）
// 存在则更新，不存在则插入
async function upsertWordProgress(env, { userId, courseName, chapterName, groupName, contentEn, contentZh, status }) {
  const existing = await getWordProgress(env, userId, courseName, chapterName, groupName, contentEn);

  if (existing) {
    const updates = {
      status,
      last_review_at: new Date().toISOString(),
    };
    // 有中文释义时一并补写（为存量数据回填 content_zh，null 时不覆盖已有值）
    if (contentZh) updates.content_zh = contentZh;
    return db.update(
      env,
      'learning_progress',
      wordFilter(userId, { courseName, chapterName, groupName, contentEn }),
      updates
    );
  }

  return db.insert(env, 'learning_progress', {
    user_id: userId,
    course_name: courseName,
    chapter_name: chapterName,
    group_name: groupName,
    content_en: contentEn,
    content_zh: contentZh,
    status,
    last_review_at: new Date().toISOString(),
  });
}

// 删除单词进度（回到 pending）
async function deleteWordProgress(env, userId, courseName, chapterName, groupName, contentEn) {
  return db.delete(
    env,
    'learning_progress',
    wordFilter(userId, { courseName, chapterName, groupName, contentEn })
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
