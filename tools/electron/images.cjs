// 知识库配图：真的把图搞出来（不再只写一份清单）
//
// 之前那套「导出清单 → 交给 CodeBuddy 生成」的流程，是因为浏览器和 dev server
// 都拿不到云端生图服务的凭证（20 积分/张，绑在 IDE 会话里）。
// 桌面端没这个限制 —— 走公开图源，主进程直连，两张都不要 key：
//
//   1. Pollinations（文生图）：GET 一个 URL 直接返回 jpeg
//      - 偶尔 503（过载/排队），重试就行，不是错误
//      - 返回的可能不是图片而是 JSON 错误体，所以必须按文件头嗅探再落盘
//   2. Wikimedia Commons（真实照片）：公开 API 搜图，下缩略图
//      - 必须带 UA，Wikimedia 会拒绝空 UA
//      - 要排掉 svg/pdf（前台只认位图）

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 60_000;
const POLLINATIONS = 'https://image.pollinations.ai/prompt';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/**
 * 生图用的 prompt。
 * 用英文题目 —— 模型对英文的理解明显更稳；中文题目只在没有英文时兜底。
 */
function buildPrompt({ title, titleEn } = {}) {
  const subject = String(titleEn ?? '').trim() || String(title ?? '').trim();
  if (!subject) throw new Error('题目是空的，拼不出 prompt');
  return [
    subject,
    "children's science encyclopedia illustration",
    'flat vector art, bright friendly colours, simple clean background',
    'no text, no words, no watermark, no caption',
  ].join(', ');
}

function pollinationsUrl(prompt, { width = 768, height = 768, seed } = {}) {
  const q = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: 'true',
  });
  if (seed !== undefined) q.set('seed', String(seed));
  return `${POLLINATIONS}/${encodeURIComponent(prompt)}?${q}`;
}

/** 按文件头判断真实格式 —— 站方返回的不一定真的是图 */
function sniffImageExt(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return '.webp';
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchBytes(url, { headers = {}, timeout = TIMEOUT_MS, fetchImpl } = {}) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const res = await doFetch(url, { headers, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * 文生图。503 是常态（站点过载），退避重试几次；
 * 拿到字节后必须嗅探 —— 见到「200 但内容是 JSON 错误体」就当失败。
 */
async function generateImage(prompt, { width, height, seed, retries = 3, fetchImpl } = {}) {
  const url = pollinationsUrl(prompt, { width, height, seed });
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const buf = await fetchBytes(url, { timeout: TIMEOUT_MS, fetchImpl });
      const ext = sniffImageExt(buf);
      if (!ext) throw new Error(`返回的不是图片（${buf.length} 字节，头 ${buf.subarray(0, 8).toString('hex')}）`);
      return { ok: true, buffer: buf, ext, url, attempts: i + 1 };
    } catch (e) {
      lastErr = e;
      // 只有 5xx / 超时值得重试，4xx 是请求本身有问题
      const retryable = e?.status >= 500 || e?.name === 'TimeoutError' || !e?.status;
      if (!retryable || i === retries - 1) break;
      await sleep(2000 * (i + 1));
    }
  }
  return { ok: false, error: lastErr?.message || String(lastErr), url };
}

/** Commons 搜图：优先用英文题目，搜不到再退回中文 */
function commonsSearchUrl(keyword, limit = 5) {
  const q = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: String(keyword ?? '').trim(),
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '1024',
    format: 'json',
  });
  return `${COMMONS_API}?${q}`;
}

/** 从 Commons 返回体里挑一张能用的图（排掉 svg/pdf 这类前台不认的） */
function pickCommonsImage(json) {
  const pages = Object.values(json?.query?.pages ?? {});
  for (const p of pages) {
    const url = p?.imageinfo?.[0]?.thumburl ?? p?.imageinfo?.[0]?.url;
    if (!url) continue;
    if (/\.(svg|pdf|tif|tiff|djvu)(\?|$)/i.test(url)) continue;
    return { url, title: p?.title ?? '' };
  }
  return null;
}

async function searchCommonsImage(keyword, { fetchImpl, retries = 2 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const buf = await fetchBytes(commonsSearchUrl(keyword), {
        headers: { 'User-Agent': UA },
        timeout: 20_000,
        fetchImpl,
      });
      const picked = pickCommonsImage(JSON.parse(buf.toString('utf8')));
      if (picked) return { ok: true, ...picked };
      return { ok: false, error: 'Commons 上没找到合适的图' };
    } catch (e) {
      lastErr = e;
      if (i === retries - 1) break;
      await sleep(1000);
    }
  }
  return { ok: false, error: lastErr?.message || String(lastErr) };
}

/** 下载一张已确定 URL 的图（Commons 走这条） */
async function downloadImage(url, { fetchImpl } = {}) {
  const buf = await fetchBytes(url, { headers: { 'User-Agent': UA }, timeout: TIMEOUT_MS, fetchImpl });
  const ext = sniffImageExt(buf);
  if (!ext) throw new Error(`下载的不是图片（${buf.length} 字节）`);
  return { ok: true, buffer: buf, ext, url };
}

module.exports = {
  buildPrompt,
  pollinationsUrl,
  sniffImageExt,
  generateImage,
  commonsSearchUrl,
  pickCommonsImage,
  searchCommonsImage,
  downloadImage,
};
