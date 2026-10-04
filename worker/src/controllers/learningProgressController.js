// src/controllers/learningProgressController.js
import {
  getUserProgress,
  getChapterProgress,
  getGroupProgress,
  getWordProgress,
  upsertWordProgress,
  deleteWordProgress,
  getProgressStats,
} from '../dal/learningProgress.js';

import { getMessage } from '../constants/messages.js';

// 获取用户所有学习进度
async function handleGetUserProgress({ env, lang, query }) {
  try {
    const { userId } = query;

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        message: getMessage('MISSING_USER_ID', lang),
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const progress = await getUserProgress(env, userId);
    return new Response(JSON.stringify({
      success: true,
      message: getMessage('PROGRESS_RETRIEVED', lang),
      data: progress,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: getMessage('INTERNAL_ERROR', lang),
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 获取用户某个章节的学习进度
async function handleGetChapterProgress({ env, lang, query }) {
  try {
    const { userId, chapterName } = query;

    if (!userId || !chapterName) {
      return new Response(JSON.stringify({
        success: false,
        message: getMessage('MISSING_PARAMS', lang),
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const progress = await getChapterProgress(env, userId, chapterName);
    return new Response(JSON.stringify({
      success: true,
      message: getMessage('PROGRESS_RETRIEVED', lang),
      data: progress,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: getMessage('INTERNAL_ERROR', lang),
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 获取用户某个章节、分组的学习进度
async function handleGetGroupProgress({ env, lang, query }) {
  try {
    const { userId, chapterName, groupName } = query;

    if (!userId || !chapterName || !groupName) {
      return new Response(JSON.stringify({
        success: false,
        message: getMessage('MISSING_PARAMS', lang),
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const progress = await getGroupProgress(env, userId, chapterName, groupName);
    return new Response(JSON.stringify({
      success: true,
      message: getMessage('PROGRESS_RETRIEVED', lang),
      data: progress,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: getMessage('INTERNAL_ERROR', lang),
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 获取单个单词的学习状态
async function handleGetWordProgress({ env, lang, query }) {
  try {
    const { userId, chapterName, groupName, contentEn } = query;

    if (!userId || !chapterName || !groupName || !contentEn) {
      return new Response(JSON.stringify({
        success: false,
        message: getMessage('MISSING_PARAMS', lang),
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const progress = await getWordProgress(env, userId, chapterName, groupName, contentEn);
    return new Response(JSON.stringify({
      success: true,
      message: getMessage('PROGRESS_RETRIEVED', lang),
      data: progress,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: getMessage('INTERNAL_ERROR', lang),
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 更新单词状态（learning / mastered）
async function handleUpsertWordProgress({ env, lang, body }) {
  try {
    const { userId, chapterName, groupName, contentEn, contentZh, status } = body;

    if (!userId || !contentEn || !['learning', 'mastered'].includes(status)) {
      return new Response(JSON.stringify({
        success: false,
        message: getMessage('PROGRESS_INVALID_STATUS', lang),
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await upsertWordProgress(env, {
      userId,
      chapterName,
      groupName,
      contentEn,
      contentZh,
      status,
    });

    return new Response(JSON.stringify({
      success: true,
      message: getMessage('PROGRESS_UPDATED', lang),
      data: result,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: getMessage('INTERNAL_ERROR', lang),
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 删除单词进度（回到 pending）
async function handleDeleteWordProgress({ env, lang, query, body }) {
  try {
    const { userId } = query;
    const { chapterName, groupName, contentEn } = body;

    if (!userId || !chapterName || !groupName || !contentEn) {
      return new Response(JSON.stringify({
        success: false,
        message: getMessage('MISSING_PARAMS', lang),
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await deleteWordProgress(env, userId, chapterName, groupName, contentEn);

    return new Response(JSON.stringify({
      success: true,
      message: getMessage('PROGRESS_DELETED', lang),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: getMessage('INTERNAL_ERROR', lang),
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 获取学习统计
async function handleGetProgressStats({ env, lang, query }) {
  try {
    const { userId } = query;

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        message: getMessage('MISSING_USER_ID', lang),
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stats = await getProgressStats(env, userId);
    return new Response(JSON.stringify({
      success: true,
      message: getMessage('PROGRESS_STATS_RETRIEVED', lang),
      data: stats,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: getMessage('INTERNAL_ERROR', lang),
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export {
  handleGetUserProgress,
  handleGetChapterProgress,
  handleGetGroupProgress,
  handleGetWordProgress,
  handleUpsertWordProgress,
  handleDeleteWordProgress,
  handleGetProgressStats,
};