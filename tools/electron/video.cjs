// 视频字幕：读目录 + 用 yt-dlp 抓字幕 + 写回本地
//
// 抓字幕必须在本机跑命令行 —— 浏览器和 Cloudflare Worker 都做不到，
// 这也是做桌面端的理由之一。yt-dlp 已装在用户机器上（Python Scripts 目录）。
//
// 抓下来的是英文字幕；中文翻译（zh 字段）留给人工/AI 补，本模块只写 en。

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { safeJoin, courseDir } = require('./paths.cjs');

const COURSE_ID = 'EnglishVideo';
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/** "Kingdergarten.json" → "Kingdergarten" */
const dirOf = (contentLink) => contentLink.replace(/\.json$/i, '');

/** 读全量视频目录，顺带探测台词文件是否存在且非空 */
function loadCatalog(dataRoot) {
  const dir = courseDir(dataRoot, COURSE_ID);
  const index = readJson(safeJoin(dir, 'data.json'));
  const chapters = Array.isArray(index?.chapters) ? index.chapters : [];

  const rows = [];
  const problems = [];

  chapters.forEach((c) => {
    const grade = dirOf(c.contentLink ?? '');
    try {
      const gradeDir = safeJoin(dir, grade);
      const items = readJson(safeJoin(gradeDir, c.contentLink))?.items ?? [];

      items.forEach((it) => {
        const tf = it?.transcriptFile ?? '';
        let has = false;
        let lineCount = 0;
        if (tf) {
          try {
            const j = readJson(safeJoin(gradeDir, tf));
            lineCount = Array.isArray(j?.lines) ? j.lines.length : 0;
            has = lineCount > 0;
          } catch {
            /* 台词文件还没生成，正常 */
          }
        }
        rows.push({
          key: `${grade}#${it?.id ?? 0}`,
          grade,
          gradeName: c.name ?? grade,
          id: it?.id ?? 0,
          series: it?.series ?? '',
          episode: it?.episode ?? '',
          titleEn: it?.englishName ?? '',
          titleZh: it?.chineseName ?? '',
          url: it?.url ?? '',
          transcriptFile: tf,
          hasTranscript: has,
          lineCount,
        });
      });
    } catch (err) {
      problems.push(`「${c.name}」读取失败：${err.message}`);
    }
  });

  return { rows, problems, courseDir: dir };
}

/**
 * 从英文标题推台词文件名，规则跟现有那批一致：
 * "Peppa Pig: Muddy Puddles" → "PeppaPigMuddyPuddles.json"
 * 英文标题为空（比如纯中文标题）时退化成 Item{id}.json —— 至少不会撞名
 */
function suggestFileName(titleEn, id) {
  const words = String(titleEn ?? '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return `Item${id}.json`;
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join('') + '.json';
}

/** "00:01:02.500" → "01:02"（跟现有台词文件里的 start 格式一致） */
function toClock(hms) {
  // srt 用逗号做毫秒分隔（00:00:02,000），vtt 用点
  const m = String(hms).match(/(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,]\d+)?/);
  if (!m) return '00:00';
  const h = Number(m[1] ?? 0);
  const mm = Number(m[2]) + h * 60;
  return `${String(mm).padStart(2, '0')}:${m[3]}`;
}

/**
 * 解析 WebVTT 字幕。
 *
 * YouTube 自动字幕有两个坑：
 *   1. 滚动式重复 —— 相邻 cue 内容高度重叠，直接逐条写会出来一堆重复行
 *   2. 行内标签 —— <c>、<00:00:01.000> 这类卡拉 OK 标记要剥掉
 * 这里按「时间线顺序 + 相邻去重」处理，够用。
 */
function parseVtt(text) {
  const raw = String(text ?? '').split(/\r?\n/);
  const cues = [];

  for (let i = 0; i < raw.length; i++) {
    // 同时认 vtt（00:00:02.000）和 srt（00:00:02,000）
    const m = raw[i].match(
      /(\d{1,2}:\d{2}:\d{2}[.,]\d{3}|\d{1,2}:\d{2}[.,]\d{3}|\d{1,2}:\d{2})\s*-->\s*(\S+)/
    );
    if (!m) continue;

    const buf = [];
    let j = i + 1;
    while (j < raw.length && raw[j].trim() !== '') {
      buf.push(raw[j]);
      j++;
    }
    i = j;

    // 标签替换成空格而不是直接删：卡拉 OK 式字幕是 <c>This is</c><c>fun</c>，
    // 直接删会粘成 "This isfun"
    const line = buf
      .join(' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (line) cues.push({ start: m[1], text: line });
  }

  // 相邻去重：YouTube 滚动字幕会把同一句拆成多个重叠 cue
  const out = [];
  cues.forEach((c) => {
    const prev = out[out.length - 1];
    if (prev && prev.text === c.text) return;
    // 后一条是前一条的尾巴（滚动），也算重复
    if (prev && prev.text.endsWith(c.text)) return;
    out.push(c);
  });

  return out.map((c, i) => ({
    index: i + 1,
    start: toClock(c.start),
    en: c.text,
    zh: '', // 中文留给人工/AI 补
  }));
}

/** 跑一条命令，实时把输出交给 onLog；超时按失败处理 */
function run(cmd, args, onLog, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let out = '';
    let err = '';
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      p.kill('SIGKILL');
      reject(new Error(`超时（${Math.round(timeoutMs / 1000)} 秒）`));
    }, timeoutMs);

    const push = (chunk) => {
      const s = chunk.toString();
      out += s;
      s.split(/\r?\n/)
        .filter((l) => l.trim())
        .forEach((l) => onLog?.(l));
    };
    p.stdout?.on('data', push);
    p.stderr?.on('data', push);

    p.on('error', (e) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(
        new Error(
          /ENOENT/.test(e.message)
            ? '没找到 yt-dlp —— 先装：pip install yt-dlp'
            : e.message
        )
      );
    });

    p.on('close', (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ code, stdout: out, stderr: err });
    });
  });
}

/** 把解析好的台词写进仓库，并把 transcriptFile 回写到年级 JSON */
function writeTranscript(dataRoot, item, lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('台词是空的');

  const dir = courseDir(dataRoot, COURSE_ID);
  const gradeDir = safeJoin(dir, String(item.grade ?? ''));
  const outDir = safeJoin(gradeDir, 'transcripts');
  fs.mkdirSync(outDir, { recursive: true });

  const fileName = String(item.transcriptFile ?? '').trim()
    ? path.basename(String(item.transcriptFile))
    : suggestFileName(item.titleEn, item.id);
  fs.writeFileSync(safeJoin(outDir, fileName), JSON.stringify({ lines }, null, 2), 'utf8');

  // 前台靠 transcriptFile 找台词，光写文件不回写的话数据里还是「缺台词」
  const gradeFile = safeJoin(gradeDir, `${item.grade}.json`);
  const gradeData = readJson(gradeFile);
  const arr = Array.isArray(gradeData?.items) ? gradeData.items : [];
  const target = arr.find((x) => Number(x?.id) === Number(item.id));
  if (target) {
    target.transcriptFile = `transcripts/${fileName}`;
    fs.writeFileSync(gradeFile, JSON.stringify(gradeData, null, 2), 'utf8');
  }

  return { ok: true, file: `transcripts/${fileName}`, lines: lines.length, id: item.id };
}

/**
 * 导入本地字幕文件（vtt / srt）。
 *
 * 为什么要有这条路：yt-dlp 抓 YouTube 需要解 JS 挑战，会去 GitHub 下 solver 脚本，
 * 网络不通时整条链路就废了。手动下字幕再导入，是这种情况下的兜底。
 */
function importTranscript(dataRoot, item, srcPath) {
  const src = String(srcPath ?? '').trim();
  if (!src) throw new Error('没选字幕文件');
  if (!fs.existsSync(src)) throw new Error(`文件不存在：${src}`);
  if (!/\.(vtt|srt)$/i.test(src)) throw new Error('只支持 .vtt 和 .srt');

  const lines = parseVtt(fs.readFileSync(src, 'utf8'));
  return writeTranscript(dataRoot, item, lines);
}

/**
 * 抓一条视频的字幕并写回本地。
 *
 * 流程：yt-dlp 只下字幕不下载视频 → 解析 vtt → 写 transcripts/xxx.json
 *      → 把 transcriptFile 写回年级 JSON（不然前台还是找不到）
 */
async function fetchTranscript(dataRoot, item, onLog = null) {
  const url = String(item?.url ?? '').trim();
  if (!url) throw new Error('这条视频没有 URL');
  if (!/^https?:\/\//i.test(url)) throw new Error(`URL 不合法：${url}`);

  // 落到临时目录，抓完解析完就删，不污染仓库
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openedu-yt-'));
  const base = `${item.grade}-${item.id}`;
  const tpl = path.join(tmp, `${base}.%(ext)s`);

  try {
    const r = await run(
      'yt-dlp',
      [
        '--skip-download', // 只要字幕，不下视频
        '--write-auto-subs', // 自动字幕
        '--write-subs', // 人工上传的字幕（优先）
        '--sub-langs', 'en.*',
        '--sub-format', 'vtt',
        // YouTube 现在要解 JS 挑战，得给 yt-dlp 一个运行时；
        // 本机没装 deno，用 node。solver 脚本不够时它会自己去 GitHub 取。
        '--js-runtimes', 'node',
        '--remote-components', 'ejs:github',
        '-o', tpl,
        url,
      ],
      onLog
    );

    if (r.code !== 0) {
      const s = r.stdout || '';
      if (/challenge solving failed|JS runtime/i.test(s)) {
        throw new Error('YouTube 需要解 JS 挑战，本机取不到 solver 脚本（网络限制）。可以改用「导入本地字幕」');
      }
      if (/not available|video is unavailable/i.test(s)) {
        throw new Error('这个视频在 YouTube 上取不到（可能下架/地区限制）。可以改用「导入本地字幕」');
      }
      throw new Error(/unsupported url/i.test(s) ? 'URL 无法识别' : 'yt-dlp 执行失败');
    }

    // 找 yt-dlp 产出的 vtt（一般是 <base>.en.vtt）
    const vtt = fs.readdirSync(tmp).filter((f) => f.startsWith(base) && f.endsWith('.vtt'));
    if (vtt.length === 0) throw new Error('这个视频没有可用的英文字幕');

    const lines = parseVtt(fs.readFileSync(path.join(tmp, vtt[0]), 'utf8'));
    return writeTranscript(dataRoot, item, lines);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = {
  loadCatalog,
  suggestFileName,
  parseVtt,
  toClock,
  fetchTranscript,
  importTranscript,
  writeTranscript,
};
