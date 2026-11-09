// desktop/src/utils/coursePath.ts 和网页完全一致，不作任何改动
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

export function getCourseDataUrl(courseId: string): string {
  return addVersion(`${getCourseBaseUrl(courseId)}/data.json`);
}

export function getCourseContentUrl(courseId: string, contentLink: string): string {
  const baseName = contentLink.replace(/\.json$/i, '');
  return addVersion(
    `${getCourseBaseUrl(courseId)}/content/${encodeURIComponent(baseName)}.json`
  );
}

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
  return `${base}/content/${clean}`;
}
