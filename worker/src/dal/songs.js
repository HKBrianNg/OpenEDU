// src/dal/songs.js
import { db } from '../utils/db.js';

// 目前支持管理歌曲的课程（与 coursePath 的课程目录一一对应）
const VALID_COURSES = ['ChineseSongs', 'EnglishSongs'];

export function isValidCourse(courseId) {
  return VALID_COURSES.includes(courseId);
}

// 读取课程歌曲目录文档（无记录返回 null，表示云端尚未初始化）
async function getSongData(env, courseId) {
  return db.selectOne(env, 'song_data', {
    filters: `course_id=eq.${courseId}`,
  });
}

// 保存目录文档（upsert：有则更新，无则插入）
async function upsertSongData(env, courseId, data) {
  const existing = await getSongData(env, courseId);
  if (existing) {
    const rows = await db.update(env, 'song_data', `course_id=eq.${courseId}`, { data });
    return rows?.[0] ?? { course_id: courseId, data };
  }
  const rows = await db.insert(env, 'song_data', { course_id: courseId, data });
  return rows?.[0] ?? { course_id: courseId, data };
}

export { getSongData, upsertSongData };
