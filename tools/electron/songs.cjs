// 歌曲管理：读目录、加歌（拷音频/歌词 + 写 data.json）、删条目
//
// 桌面端比 Web 强的地方：能用系统文件选择框挑本地 mp3/lrc，直接拷进仓库目录。
// Web 端只能靠 gequhai 抓取，且只能在 dev server 下写盘。
//
// 文件命名沿用现有规则：英文名转小写、空格换连字符。
// 必须是 ASCII —— 歌曲文件名走 jsDelivr，中文名会 404（图片那边是实测可用，
// 但歌曲这批现有文件名全是 ASCII，保持一致最省心）。

const path = require('node:path');
const fs = require('node:fs');
const { safeJoin, courseDir } = require('./paths.cjs');

const ALLOWED_SONGS = new Set(['ChineseSongs', 'EnglishSongs']);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

function songsDir(dataRoot, courseId) {
  if (!ALLOWED_SONGS.has(courseId)) throw new Error(`不允许的课程：${courseId}`);
  return courseDir(dataRoot, courseId);
}

/**
 * 文件名 slug：只留 ASCII 可打印字符。
 * "Children's Sky" → "children's-sky"（跟现有文件一致，撇号保留）
 * 中文会被去掉；全中文又没英文名时退化成 song-<时间戳>，避免空文件名。
 */
function slugify(s) {
  const out = String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\x20-\x7e]/g, '') // 先去掉非 ASCII（中文等）
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return out || `song-${Date.now()}`;
}

/** data.json 里的路径是 "/audio/xxx.mp3"，转成磁盘路径时用这个 */
function diskPath(dir, ref) {
  return safeJoin(dir, String(ref ?? '').replace(/^\/+/, ''));
}

function loadSongs(dataRoot, courseId) {
  const dir = songsDir(dataRoot, courseId);
  const data = readJson(safeJoin(dir, 'data.json'));
  const categories = Array.isArray(data?.categories) ? data.categories : [];

  const rows = [];
  categories.forEach((cat, ci) => {
    (cat?.items ?? []).forEach((it, ii) => {
      const audioRef = it?.audio ?? '';
      const lyricRef = it?.lyric ?? '';
      rows.push({
        key: `${ci}#${ii}`,
        categoryIndex: ci,
        itemIndex: ii,
        category: cat?.name ?? '',
        categoryEn: cat?.en ?? '',
        name: it?.name ?? '',
        en: it?.en ?? '',
        audio: audioRef,
        lyric: lyricRef,
        // 目录里标了文件、但磁盘上找不到 —— 这种断链前台会加载失败
        audioExists: audioRef ? fs.existsSync(diskPath(dir, audioRef)) : false,
        lyricExists: lyricRef ? fs.existsSync(diskPath(dir, lyricRef)) : false,
      });
    });
  });

  // 磁盘上有、但 data.json 里没引用的文件（加歌加漏了 / 删条目时留下的）
  const referenced = new Set(
    rows.flatMap((r) => [path.basename(r.audio), path.basename(r.lyric)]).filter(Boolean)
  );
  const orphans = [];
  ['audio', 'lyric'].forEach((sub) => {
    const d = path.join(dir, sub);
    if (!fs.existsSync(d)) return;
    fs.readdirSync(d).forEach((f) => {
      if (!referenced.has(f)) orphans.push(`${sub}/${f}`);
    });
  });

  return { rows, orphans, categories: categories.map((c) => c?.name ?? ''), data, dir };
}

/**
 * 加一首歌：把音频/歌词拷进仓库目录，再插进 data.json。
 * 分类不存在就新建。返回写好的条目，方便界面上提示。
 */
function addSong(dataRoot, courseId, input) {
  const dir = songsDir(dataRoot, courseId);
  const name = String(input?.name ?? '').trim();
  if (!name) throw new Error('歌名不能为空');

  const audioSrc = String(input?.audioSrc ?? '').trim();
  if (!audioSrc) throw new Error('必须选一个音频文件');
  if (!fs.existsSync(audioSrc)) throw new Error(`音频文件不存在：${audioSrc}`);

  const lyricSrc = String(input?.lyricSrc ?? '').trim();
  if (lyricSrc && !fs.existsSync(lyricSrc)) throw new Error(`歌词文件不存在：${lyricSrc}`);

  const slug = slugify(input?.en || name);
  const audioExt = path.extname(audioSrc).toLowerCase() || '.mp3';
  const lyricExt = lyricSrc ? path.extname(lyricSrc).toLowerCase() || '.lrc' : '.lrc';

  const audioName = `${slug}${audioExt}`;
  const lyricName = `${slug}${lyricExt}`;

  fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'lyric'), { recursive: true });
  fs.copyFileSync(audioSrc, path.join(dir, 'audio', audioName));
  if (lyricSrc) fs.copyFileSync(lyricSrc, path.join(dir, 'lyric', lyricName));

  const catName = String(input?.category ?? '').trim() || '未分类';
  const catEn = String(input?.categoryEn ?? '').trim() || catName;

  return insertSong(dataRoot, courseId, {
    category: catName,
    categoryEn: catEn,
    name,
    en: input?.en,
    audioRef: `/audio/${audioName}`,
    lyricRef: `/lyric/${lyricName}`,
    written: { audioName, lyricName: lyricSrc ? lyricName : null },
  });
}

/**
 * 把条目插进 data.json。添加歌曲（本地文件）和网上导入（下载来的字节）
 * 最后都要走这一步，抽出来避免两边各写一份。
 */
function insertSong(dataRoot, courseId, input) {
  const dir = songsDir(dataRoot, courseId);
  const name = String(input?.name ?? '').trim();
  if (!name) throw new Error('歌名不能为空');

  const file = safeJoin(dir, 'data.json');
  const data = readJson(file);
  data.categories = Array.isArray(data.categories) ? data.categories : [];

  const catName = String(input?.category ?? '').trim() || '未分类';
  const catEn = String(input?.categoryEn ?? '').trim() || catName;
  let cat = data.categories.find((c) => (c?.name ?? '') === catName);
  if (!cat) {
    cat = { name: catName, en: catEn, items: [] };
    data.categories.push(cat);
  }
  cat.items = Array.isArray(cat.items) ? cat.items : [];

  // 同名重复插入会让前台出现两条一样的歌
  if (cat.items.some((it) => (it?.name ?? '') === name)) {
    throw new Error(`「${name}」已经在这个分类里了`);
  }

  const item = {
    name,
    en: String(input?.en ?? '').trim(),
    audio: String(input?.audioRef ?? ''),
    lyric: String(input?.lyricRef ?? ''),
  };
  cat.items.push(item);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

  return { ok: true, item, ...(input?.written ?? {}) };
}

/**
 * 存从网上下载来的歌（音频字节 + 歌词文本）。
 * 与 addSong 的区别：音频来自内存 buffer，不是本地文件。
 */
function saveRemoteSong(dataRoot, courseId, input) {
  const dir = songsDir(dataRoot, courseId);
  const name = String(input?.name ?? '').trim();
  if (!name) throw new Error('歌名不能为空');

  const buf = input?.audioBuffer;
  if (!Buffer.isBuffer(buf) || buf.length === 0) throw new Error('没有音频数据');
  const ext = String(input?.audioExt ?? '').trim();
  if (!/^\.[a-z0-9]{2,4}$/i.test(ext)) throw new Error(`音频格式不认识：${ext}`);

  const slug = slugify(input?.en || name);
  const audioName = `${slug}${ext}`;
  const lyricName = `${slug}.lrc`;

  fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'lyric'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'audio', audioName), buf);

  let wroteLrc = false;
  if (String(input?.lrc ?? '').trim()) {
    fs.writeFileSync(path.join(dir, 'lyric', lyricName), String(input.lrc), 'utf8');
    wroteLrc = true;
  }

  const out = insertSong(dataRoot, courseId, {
    category: input?.category,
    categoryEn: input?.categoryEn,
    name,
    en: input?.en,
    audioRef: `/audio/${audioName}`,
    lyricRef: wroteLrc ? `/lyric/${lyricName}` : '',
    written: { audioName, lyricName: wroteLrc ? lyricName : null },
  });
  return { ...out, audioBytes: buf.length, wroteLrc };
}

/**
 * 删一个条目。默认不动磁盘文件 —— 音频可能还被别的条目引用，
 * 而且删文件的代价远大于留一个孤儿文件（界面上会列出来提示）。
 */
function removeSong(dataRoot, courseId, key) {
  const dir = songsDir(dataRoot, courseId);
  const [ci, ii] = String(key).split('#').map(Number);
  if (!Number.isInteger(ci) || !Number.isInteger(ii)) throw new Error(`key 不合法：${key}`);

  const file = safeJoin(dir, 'data.json');
  const data = readJson(file);
  const cat = data?.categories?.[ci];
  if (!cat || !Array.isArray(cat.items) || !cat.items[ii]) {
    throw new Error(`找不到这个条目：${key}`);
  }

  const [removed] = cat.items.splice(ii, 1);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, removed };
}

module.exports = { loadSongs, addSong, removeSong, saveRemoteSong, insertSong, slugify };
