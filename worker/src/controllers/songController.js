// src/controllers/songController.js
import { json } from '../routes/index.js';
import { getMessage } from '../constants/messages.js';
import { getSongData, upsertSongData, isValidCourse } from '../dal/songs.js';

// 课程目录文档形状校验（与前端 data.json 形状一致）
// { title, titleEn, categories: [{ name, en, items: [{ name, en, audio, lyric }] }] }
function isValidSongData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (typeof data.title !== 'string' || typeof data.titleEn !== 'string') return false;
  if (!Array.isArray(data.categories)) return false;

  for (const category of data.categories) {
    if (!category || typeof category !== 'object' || Array.isArray(category)) return false;
    if (typeof category.name !== 'string' || typeof category.en !== 'string') return false;
    if (!Array.isArray(category.items)) return false;

    for (const item of category.items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      if (typeof item.name !== 'string' || typeof item.en !== 'string') return false;
      if (typeof item.audio !== 'string' || typeof item.lyric !== 'string') return false;
    }
  }
  return true;
}

// 获取课程目录（仅 admin）
export const getSongDataController = async ({ env, lang, query }) => {
  const { courseId } = query;

  if (!isValidCourse(courseId)) {
    return json({
      code: 'INVALID_COURSE',
      message: getMessage('INVALID_COURSE', lang),
    }, 400);
  }

  try {
    const row = await getSongData(env, courseId);
    if (!row) {
      return json({
        code: 'SONGS_NOT_FOUND',
        message: getMessage('SONGS_NOT_FOUND', lang),
      }, 404);
    }

    return json({
      code: 'SONGS_RETRIEVED',
      message: getMessage('SONGS_RETRIEVED', lang),
      data: row.data,
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};

// 保存课程目录（仅 admin，整份 upsert）
export const saveSongDataController = async ({ env, lang, body }) => {
  const { courseId, data } = body;

  if (!isValidCourse(courseId)) {
    return json({
      code: 'INVALID_COURSE',
      message: getMessage('INVALID_COURSE', lang),
    }, 400);
  }

  if (!isValidSongData(data)) {
    return json({
      code: 'INVALID_SONG_DATA',
      message: getMessage('INVALID_SONG_DATA', lang),
    }, 400);
  }

  try {
    const row = await upsertSongData(env, courseId, data);
    return json({
      code: 'SONGS_SAVED',
      message: getMessage('SONGS_SAVED', lang),
      data: row.data,
    });
  } catch (error) {
    return json({
      code: 'INTERNAL_ERROR',
      message: error.message || getMessage('INTERNAL_ERROR', lang),
    }, 500);
  }
};
