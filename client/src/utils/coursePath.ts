// src/utils/coursePath.ts

const CDN_BASE = import.meta.env.VITE_CDN_BASE || 'https://cdn.jsdelivr.net/gh/HKBrianNg/img-library@main';
const ROOT_SUB_DIR = 'openEDU';
const USE_LOCAL_DATA = import.meta.env.VITE_USE_LOCAL_DATA === 'true';
const DATA_VERSION = import.meta.env.VITE_DATA_VERSION || '1';

function cleanPathSegment(str: string): string {
  return str.replace(/^\/+|\/+$/g, '');
}

function addVersion(url: string): string {
  if (USE_LOCAL_DATA) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${DATA_VERSION}`;
}

/**
 * 获取指定课程的基础 URL
 * @param courseId 课程标识，如 'JuniorEncyclopedia'
 * @returns 基础路径（末尾无斜杠）
 *
 * 本地模式：/data/{courseId}
 * CDN 模式：{CDN_BASE}/{ROOT_SUB_DIR}/{courseId}
 */
export function getCourseBaseUrl(courseId: string): string {
  if (USE_LOCAL_DATA) {
    return `/data/${courseId}`;
  }
  return [
    cleanPathSegment(CDN_BASE),
    cleanPathSegment(ROOT_SUB_DIR),
    courseId,
  ]
    .filter(Boolean)
    .join('/');
}

/**
 * 获取课程 data.json 的完整 URL（已带版本号）
 */
export function getCourseDataUrl(courseId: string): string {
  return addVersion(`${getCourseBaseUrl(courseId)}/data.json`);
}

/**
 * 获取课程某个内容 JSON 的完整 URL（已带版本号）
 * @param courseId 课程标识
 * @param contentLink 内容文件名（不含扩展名），如 'Face-to-Face'
 */
export function getCourseContentUrl(courseId: string, contentLink: string): string {
  return addVersion(
    `${getCourseBaseUrl(courseId)}/content/${encodeURIComponent(contentLink)}.json`
  );
}

/**
 * 获取课程资源的完整 URL（如图片、附件等）
 * @param courseId 课程标识
 * @param relativePath 相对路径，如 'Face-to-Face.jpg' 或 'images/xxx.png'
 */
export function getCourseAssetUrl(courseId: string, relativePath: string): string {
  const base = getCourseBaseUrl(courseId);
  const cleanPath = relativePath.replace(/^\//, '');
  return addVersion(`${base}/${cleanPath}`);
}

export function getCourseImageUrl(courseId: string, imageLink?: string): string | undefined {
  if (!imageLink) return undefined;
  if (/^https?:\/\//.test(imageLink)) return imageLink;

  const base = getCourseBaseUrl(courseId);
  const clean = imageLink.replace(/^\/+/, '');

  // 当前约定：图片与内容 json 同放在 content/ 目录
  return `${base}/content/${clean}`;
}