// jsDelivr CDN 缓存清理
//
// 为什么要有这个：前台的数据/音频全走
//   https://cdn.jsdelivr.net/gh/HKBrianNg/img-library@main/openEDU/...
// jsDelivr 对分支（@main）的缓存是 12 小时（响应头 s-maxage=43200）。
// 推完 GitHub 前台不会立刻变，得主动清一次缓存。
//
// 两个反直觉的点（都实测过）：
//   1. 加 ?v=xxx 版本号没用 —— jsDelivr 忽略 query string，按路径缓存。
//      ?v=1 和 ?v=9999 拿到的是同一份缓存副本。
//   2. purge 端点现在是 GET，不是 POST —— POST 会 405（Allow: GET, OPTIONS）。
//
// 新加的文件不用清（没缓存过，直接就有）；只有**改过的**文件需要清，
// 主要是 data.json。

const REPO = 'HKBrianNg/img-library';
const BRANCH = 'main';
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${REPO}@${BRANCH}`;
const PURGE_BASE = 'https://purge.jsdelivr.net';
const TIMEOUT_MS = 15000;

/** 路径必须是仓库内 openEDU/ 下的相对路径，挡掉 ../ 和绝对路径 */
function normalize(rel) {
  const p = String(rel ?? '').trim().replace(/^\/+/, '');
  if (!p.startsWith('openEDU/')) throw new Error(`路径必须在 openEDU/ 下：${rel}`);
  if (p.includes('..')) throw new Error(`路径不合法：${rel}`);
  return p;
}

const cdnUrl = (rel) => `${CDN_BASE}/${normalize(rel)}`;
const purgeUrl = (rel) => `${PURGE_BASE}/gh/${REPO}@${BRANCH}/${normalize(rel)}`;

async function fetchWithTimeout(url, init, impl) {
  const doFetch = impl ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await doFetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 数一份歌曲 data.json 里的条目总数（categories[].items） */
function countItems(data) {
  const cats = Array.isArray(data?.categories) ? data.categories : [];
  return cats.reduce((n, c) => n + (Array.isArray(c?.items) ? c.items.length : 0), 0);
}

/**
 * 清一条路径的缓存。
 * @returns {{ path: string, ok: boolean, status?: string, error?: string }}
 */
async function purge(rel, impl = null) {
  const p = normalize(rel);
  try {
    const res = await fetchWithTimeout(purgeUrl(p), undefined, impl);
    const body = await res.json().catch(() => ({}));
    // 成功时返回 { id, status: 'finished'|'pending', paths }
    if (!res.ok) {
      return { path: p, ok: false, error: body?.error?.message || `HTTP ${res.status}` };
    }
    return { path: p, ok: true, status: body?.status ?? 'ok' };
  } catch (e) {
    return { path: p, ok: false, error: e?.message || String(e) };
  }
}

/**
 * 探一下 CDN 上的 data.json 现在是什么内容。
 * 用来确认「清完是不是真的生效了」——光看 purge 返回成功不算数。
 * @returns {{ path: string, ok: boolean, status?: number, age?: string|null, count?: number, data?: object }}
 */
async function probe(rel, impl = null) {
  const p = normalize(rel);
  try {
    const res = await fetchWithTimeout(cdnUrl(p), undefined, impl);
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      /* 不是 JSON 就算了 */
    }
    return {
      path: p,
      ok: res.ok,
      status: res.status,
      // age 是这份缓存已经活了多久（秒），null 表示刚回源
      age: res.headers?.get?.('age') ?? null,
      count: data ? countItems(data) : null,
      data,
    };
  } catch (e) {
    return { path: p, ok: false, error: e?.message || String(e) };
  }
}

module.exports = { CDN_BASE, PURGE_BASE, purgeUrl, cdnUrl, countItems, purge, probe };
