// 路径安全：所有业务模块共用的两道闸。
//
// 1. 课程白名单 —— 渲染进程传别的 id 一律拒绝
// 2. safeJoin —— 挡住 ../ 穿越
//
// 单独抽出来是因为知识库、视频、歌曲三块都要用，
// 各写一份迟早会漏掉某个校验。

const path = require('node:path');

/** 允许操作的课程。按需加，不要图省事用「全部允许」 */
const ALLOWED_COURSES = new Set([
  'KnowledgeBase',
  'EnglishVideo',
  'ChineseSongs',
  'EnglishSongs',
]);

function safeJoin(base, rel) {
  const abs = path.resolve(base, rel);
  const relOut = path.relative(base, abs);
  // 跑到 base 外面去了（../ 或绝对路径）→ 拒绝
  if (relOut.startsWith('..') || path.isAbsolute(relOut)) {
    throw new Error(`路径越界：${rel}`);
  }
  return abs;
}

function courseDir(dataRoot, courseId) {
  if (!ALLOWED_COURSES.has(courseId)) throw new Error(`不允许的课程：${courseId}`);
  return safeJoin(dataRoot, courseId);
}

module.exports = { safeJoin, courseDir, ALLOWED_COURSES };
