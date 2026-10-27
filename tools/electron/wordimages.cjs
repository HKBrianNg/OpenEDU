// EnglishWord 单词配图的维护：列状态 / 导入图片 / 生成缩略图 / 删除。
//
// 为什么单独一块面板来管：卡片加载的是 content/thumb/ 里的缩略图（长边 400px），
// 而缩略图是从 content/ 的原图生成的。加一张图要「放原图 → 生成缩略图」两步，
// 手敲命令容易漏第二步（漏了前台就会退回原图，白胖一张）。这里把两步合成一次操作。
//
// 缩略图编码走 Electron 自带的 Chromium（隐藏窗口 + canvas），不引 sharp 这类原生模块 ——
// 原生模块要跟 Electron 的 Node ABI 对齐，装完还得 rebuild，换台机器就崩。
// 输出格式/尺寸/质量跟 img-library 的 scripts/gen-thumbs.mjs 保持一致（WebP / 400 / 0.72）。

const path = require('node:path');
const fs = require('node:fs');
const { safeJoin, courseDir } = require('./paths.cjs');

const COURSE_ID = 'EnglishWord';
const THUMB_DIR = 'thumb';
const LONG_EDGE = 400;
const QUALITY = 0.72;

const IMAGE_FILE_RE = /\.(jpe?g|png|webp)$/i;

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/** 英文名 → 图片文件名。跟前端 utils/image.ts 的 getImageName 必须一致 */
function toFileSlug(en) {
  return (
    String(en ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') + '.jpg'
  );
}

/**
 * 这个词对应的图片文件名。
 * 数据里写了 url 就用它（可能带前导斜杠，去掉）；没写就按英文名推。
 */
function imageFileOf(item) {
  const url = String(item?.url ?? '').trim();
  if (url) return { file: url.replace(/^\/+/, ''), fromUrl: true };
  if (item?.en) return { file: toFileSlug(item.en), fromUrl: false };
  return { file: '', fromUrl: false };
}

/** 目录里的图片清单：文件名 → 字节数。先扫一遍，省得逐个 stat */
function scanDir(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir)) {
    if (!IMAGE_FILE_RE.test(f)) continue;
    try {
      map.set(f, fs.statSync(path.join(dir, f)).size);
    } catch {
      /* 跳过读不了的 */
    }
  }
  return map;
}

function loadWordImages(dataRoot) {
  const dir = courseDir(dataRoot, COURSE_ID);
  const contentDir = safeJoin(dir, 'content');
  const thumbDir = safeJoin(contentDir, THUMB_DIR);

  const index = readJson(safeJoin(dir, 'data.json'));
  const chapters = Array.isArray(index?.chapters) ? index.chapters : [];

  const originals = scanDir(contentDir);
  const thumbs = scanDir(thumbDir);

  const rows = [];
  const problems = [];

  chapters.forEach((c) => {
    const contentLink = String(c?.contentLink ?? '').trim();
    if (!contentLink) return;
    try {
      // 章节 json 在课程根目录（EnglishWord/Kindergarten.json），
      // 只有图片在 content/ 下 —— 跟 KnowledgeBase 那个「正文也放 content/」的约定不一样
      const file = safeJoin(dir, contentLink);
      if (!fs.existsSync(file)) {
        problems.push(`「${c?.name ?? contentLink}」${contentLink} 不存在`);
        return;
      }
      const items = readJson(file);
      if (!Array.isArray(items)) {
        problems.push(`「${c?.name ?? contentLink}」不是数组`);
        return;
      }
      items.forEach((it, i) => {
        const { file: img, fromUrl } = imageFileOf(it);
        rows.push({
          key: `${contentLink}#${i}`,
          chapter: c?.name ?? '',
          chapterEn: c?.en ?? '',
          contentLink,
          index: i,
          name: it?.name ?? '',
          en: it?.en ?? '',
          file: img,
          fromUrl,
          hasImage: Boolean(img) && originals.has(img),
          hasThumb: Boolean(img) && thumbs.has(img),
          imageBytes: originals.get(img) ?? 0,
          thumbBytes: thumbs.get(img) ?? 0,
        });
      });
    } catch (err) {
      problems.push(`「${c?.name ?? contentLink}」读取失败：${err.message}`);
    }
  });

  return {
    rows,
    problems,
    courseDir: dir,
    counts: {
      // 按词计：不同章节可能有同一个词（比如 apple 在幼儿园和三年级都有），会被重复计一次
      total: rows.length,
      withImage: rows.filter((r) => r.hasImage).length,
      withThumb: rows.filter((r) => r.hasThumb).length,
      // 有原图但没缩略图 —— 这是最该处理的一类：前台会退回原图，白胖一张
      missingThumb: rows.filter((r) => r.hasImage && !r.hasThumb).length,
      // 按文件计：content/ 里实际有几个图片文件、其中几个有缩略图。
      // 进度条用这个 —— 按词算会因为共用图而虚高。
      uniqueImages: originals.size,
      uniqueThumbs: [...thumbs.keys()].filter((f) => originals.has(f)).length,
    },
  };
}

/** 按 key 找到条目，并读出它所在的章节文件（改数据要用） */
function locate(dataRoot, contentLink, index) {
  const dir = courseDir(dataRoot, COURSE_ID);
  const contentDir = safeJoin(dir, 'content');
  const jsonPath = safeJoin(dir, String(contentLink ?? '').trim());
  const src = fs.readFileSync(jsonPath, 'utf8');
  const items = JSON.parse(src);
  if (!Array.isArray(items)) throw new Error(`${contentLink} 不是数组`);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= items.length) {
    throw new Error(`条目下标越界：${index}（共 ${items.length} 条）`);
  }
  return { dir, contentDir, jsonPath, src, items, i };
}

/**
 * 给一个词配图：把本地图片复制（转码）进 content/，顺手生成缩略图。
 *
 * 文件名沿用「url 字段 → 英文名推导」的既有规则，所以大多数情况下不用动 JSON。
 * 只有原来没写 url、而传入文件名又对不上推导名时，才回写 url —— 免得存了图前台却找不到。
 */
async function importWordImage(dataRoot, input) {
  const srcPath = String(input?.srcPath ?? '').trim();
  if (!srcPath) throw new Error('没选图片文件');
  if (!fs.existsSync(srcPath)) throw new Error(`文件不存在：${srcPath}`);
  if (!IMAGE_FILE_RE.test(srcPath)) throw new Error('不是图片文件（要 jpg / png / webp）');

  const { contentDir, jsonPath, src, items, i } = locate(dataRoot, input?.contentLink, input?.index);

  const { file, fromUrl } = imageFileOf(items[i]);
  if (!file) throw new Error('这个词既没有英文名也没写 url，定不了文件名');

  const target = safeJoin(contentDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });

  // 原图直接复制：用户在别处压好的图不该被我们再压一次
  const buf = fs.readFileSync(srcPath);
  fs.writeFileSync(target, buf);

  // 只有当文件名跟推导名不一致时，才需要把 url 写进数据（否则前台推不出来）
  let wroteUrl = false;
  if (!fromUrl && file !== toFileSlug(items[i]?.en)) {
    items[i].url = file;
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2).replace(/\n/g, eol), 'utf8');
    wroteUrl = true;
  }

  const thumb = await genOneThumb(dataRoot, file);

  return {
    ok: true,
    file,
    bytes: buf.length,
    wroteUrl,
    thumb,
    name: items[i]?.name ?? '',
    en: items[i]?.en ?? '',
  };
}

/**
 * 删掉一个词的图：content/ 和 content/thumb/ 各删一份。
 * 顺序是先改 JSON 再删文件 —— 反过来的话，写失败会留下「图没了但还指着它」的死链。
 */
function deleteWordImage(dataRoot, input) {
  const { contentDir, jsonPath, src, items, i } = locate(dataRoot, input?.contentLink, input?.index);
  const { file, fromUrl } = imageFileOf(items[i]);
  if (!file) throw new Error('这个词没有图片字段');

  let clearedUrl = false;
  if (fromUrl) {
    delete items[i].url;
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2).replace(/\n/g, eol), 'utf8');
    clearedUrl = true;
  }

  const removed = [];
  for (const rel of [file, path.join(THUMB_DIR, file)]) {
    const p = safeJoin(contentDir, rel);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      removed.push(rel);
    }
  }

  return { ok: true, file, removed, clearedUrl, name: items[i]?.name ?? '' };
}

// ── 缩略图 ────────────────────────────────────────────────────────────
// 隐藏窗口 + canvas：把图缩到长边 400px 再编码成 WebP。
// 缩完反而比原图大的话（本来就是 200px 的小图，重编码只会更大）就直接复制原图 ——
// 跟 img-library 那个脚本一样的判断，也保证 thumb/ 里每个名字都有文件，
// 前台不会先 404 一次再回退。

let thumbWin = null;

async function ensureThumbWindow() {
  if (thumbWin && !thumbWin.isDestroyed()) return thumbWin;
  const { BrowserWindow } = require('electron');
  // 只用它的 canvas 编码能力，所以窗口不显示。
  // （不开 offscreen：离屏渲染那套 API 在新版 Electron 里变动过，没必要碰）
  thumbWin = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  await thumbWin.loadURL('about:blank');
  return thumbWin;
}

function mimeOf(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

/** 生成单张缩略图，返回 { ok, bytes, copied } */
async function genOneThumb(dataRoot, file) {
  const { contentDir } = (() => {
    const dir = courseDir(dataRoot, COURSE_ID);
    return { contentDir: safeJoin(dir, 'content') };
  })();

  const src = safeJoin(contentDir, file);
  if (!fs.existsSync(src)) return { ok: false, error: `原图不存在：${file}` };

  const outDir = safeJoin(contentDir, THUMB_DIR);
  const out = safeJoin(outDir, file);
  fs.mkdirSync(outDir, { recursive: true });

  const srcBytes = fs.statSync(src).size;
  const b64 = fs.readFileSync(src).toString('base64');

  const win = await ensureThumbWindow();
  const dataUrl = await win.webContents.executeJavaScript(
    `(async () => {
      const img = new Image();
      img.src = 'data:${mimeOf(file)};base64,${b64}';
      await img.decode();
      const scale = Math.min(1, ${LONG_EDGE} / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/webp', ${QUALITY});
    })()`,
    true
  );

  const prefix = 'data:image/webp;base64,';
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(prefix)) {
    // 浏览器不支持 webp 编码时会静默退回 png，这里认死前缀，别写出名不副实的文件
    return { ok: false, error: `缩略图编码失败：${String(dataUrl).slice(0, 32)}` };
  }

  const buf = Buffer.from(dataUrl.slice(prefix.length), 'base64');
  if (buf.length >= srcBytes) {
    fs.copyFileSync(src, out);
    return { ok: true, bytes: srcBytes, copied: true };
  }
  fs.writeFileSync(out, buf);
  return { ok: true, bytes: buf.length, copied: false };
}

/**
 * 批量生成缩略图。files 为空时，自动挑出「有原图但没缩略图」的那些。
 * onProgress 逐张回调，界面上才有得看（几百张不然像卡死）。
 */
async function genThumbs(dataRoot, files, onProgress) {
  const { rows } = loadWordImages(dataRoot);
  const wanted = new Set(
    (Array.isArray(files) ? files : []).map((f) => String(f ?? '').trim()).filter(Boolean)
  );
  const targets =
    wanted.size > 0
      ? rows.filter((r) => wanted.has(r.file) && r.hasImage)
      : rows.filter((r) => r.hasImage && !r.hasThumb);

  const results = [];
  for (let n = 0; n < targets.length; n++) {
    const r = targets[n];
    onProgress?.({ n: n + 1, total: targets.length, file: r.file, name: r.name, stage: 'start' });
    try {
      const got = await genOneThumb(dataRoot, r.file);
      onProgress?.({
        n: n + 1,
        total: targets.length,
        file: r.file,
        name: r.name,
        stage: 'done',
        ok: got.ok,
        error: got.error,
        copied: got.copied,
      });
      results.push({ key: r.key, file: r.file, ...got });
    } catch (err) {
      onProgress?.({
        n: n + 1,
        total: targets.length,
        file: r.file,
        name: r.name,
        stage: 'done',
        ok: false,
        error: err.message,
      });
      results.push({ key: r.key, file: r.file, ok: false, error: err.message });
    }
  }

  return { results, ok: results.every((r) => r.ok) };
}

/** 用完把隐藏窗口收掉（关窗口 / 退出时调） */
function disposeThumbWindow() {
  try {
    if (thumbWin && !thumbWin.isDestroyed()) thumbWin.destroy();
  } catch {
    /* 关都关不掉就算了 */
  }
  thumbWin = null;
}

module.exports = {
  COURSE_ID,
  toFileSlug,
  imageFileOf,
  loadWordImages,
  importWordImage,
  deleteWordImage,
  genThumbs,
  disposeThumbWindow,
};
