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

/**
 * 子进程环境：把 NODE_OPTIONS 清掉。
 *
 * 这不是洁癖。某些 IDE / 沙箱会往环境变量里塞 node shim
 * （形如 --require=.../node-language-shim.cjs），子进程会原样继承。
 * yt-dlp 解 YouTube 的 JS 挑战时要派生一次 node，那个 shim 就会以
 * Permission denied（FileSystemRead）把它掐死，最后报
 * "n challenge solving failed / This video is not available"。
 *
 * 现象看着像「这台机器抓不了字幕」，其实跟机器和网络都没关系 ——
 * 在同一个终端里 `Remove-Item Env:NODE_OPTIONS` 之后 yt-dlp 一切正常。
 * 加上这一句，工具就算是从那种环境里启动的也能正常抓取。
 */
function childEnv() {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  return env;
}

/** 跑一条命令，实时把输出交给 onLog；超时按失败处理 */
function run(cmd, args, onLog, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true, env: childEnv() });
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
  const gradeSrc = fs.readFileSync(gradeFile, 'utf8');
  const gradeData = JSON.parse(gradeSrc);
  const arr = Array.isArray(gradeData?.items) ? gradeData.items : [];
  const target = arr.find((x) => Number(x?.id) === Number(item.id));
  if (target) {
    target.transcriptFile = `transcripts/${fileName}`;
    writeJsonLike(gradeFile, gradeSrc, gradeData);
  }

  return { ok: true, file: `transcripts/${fileName}`, lines: lines.length, id: item.id };
}

/**
 * 整文件重写 JSON，但保持原文件的换行风格和结尾是否带换行。
 *
 * 为什么在意这个：这些 JSON 是 2 空格缩进 + CRLF + 末尾一个换行，
 * 直接 JSON.stringify(_, null, 2) 写回去会把末尾换行吃掉，
 * 于是每次回写都产生 1 字节的无意义 diff，久了就看不出真正改了什么。
 */
function writeJsonLike(file, src, data) {
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const endNl = /(\r?\n)\s*$/.exec(src);
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2).replace(/\n/g, eol) + (endNl ? endNl[1] : ''),
    'utf8'
  );
}

/**
 * 在网上搜视频（走 yt-dlp 的 ytsearch）。
 *
 * runner 可以注入 —— 测试里塞个假的命令执行器就够了，不用真联网。
 */
async function searchOnline(keyword, { limit = 12, runner = run } = {}) {
  const kw = String(keyword ?? '').trim();
  if (!kw) throw new Error('请输入搜索关键词');

  const n = Math.min(Math.max(Number(limit) || 12, 1), 30);
  const sep = '\t';
  const r = await runner(
    'yt-dlp',
    [
      '--flat-playlist', // 只要列表信息，不碰视频本身
      '--no-warnings',
      '--print',
      ['%(id)s', '%(title)s', '%(channel)s', '%(duration_string)s'].join(sep),
      `ytsearch${n}:${kw}`,
    ],
    null,
    90000
  );

  // 注入的 runner 可以直接返回字符串（测试里方便），两种都接
  const out = typeof r === 'string' ? r : (r?.stdout ?? '');
  if (typeof r === 'object' && r?.code !== 0) {
    throw new Error(
      /HTTPError 429|Too Many Requests/i.test(out)
        ? 'YouTube 限流了，等一会儿再试'
        : /network|timed out|Could not reach|unable to download/i.test(out)
          ? '连不上 YouTube'
          : 'yt-dlp 搜索失败'
    );
  }

  const seen = new Set();
  const rows = [];
  out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [id, title, channel, duration] = line.split(sep);
      // yt-dlp 偶尔会把警告行混进 stdout，靠 id 的形状把它们筛掉
      if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return;
      if (seen.has(id)) return;
      seen.add(id);
      rows.push({
        videoId: id,
        title: title || '(无标题)',
        channel: channel || '',
        duration: duration || '',
        url: `https://www.youtube.com/watch?v=${id}`,
      });
    });

  return rows;
}

/**
 * 往年级 JSON 里加一条新视频。
 *
 * 网上搜到某一集 → 加进来，之后的抓字幕、补中文都跟既有条目一样处理。
 */
function addVideoItem(dataRoot, input) {
  const grade = String(input?.grade ?? '').trim();
  if (!grade) throw new Error('没选年级');

  const dir = courseDir(dataRoot, COURSE_ID);
  const gradeFile = safeJoin(safeJoin(dir, grade), `${grade}.json`);
  const src = fs.readFileSync(gradeFile, 'utf8');
  const data = JSON.parse(src);
  const items = Array.isArray(data?.items) ? data.items : [];

  const url = String(input?.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error(`视频 URL 不合法：${url || '(空)'}`);
  if (items.some((x) => String(x?.url ?? '').trim() === url)) {
    throw new Error('这条视频已经在目录里了');
  }

  const nextId = items.reduce((m, x) => Math.max(m, Number(x?.id) || 0), 0) + 1;
  const item = {
    id: nextId,
    series: String(input?.series ?? '').trim(),
    episode: String(input?.episode ?? '').trim(),
    englishName: String(input?.titleEn ?? '').trim(),
    chineseName: String(input?.titleZh ?? '').trim(),
    url,
  };

  items.push(item);
  writeJsonLike(gradeFile, src, data);

  return { ok: true, id: nextId, grade, item };
}

/**
 * 网上搜到的视频直接落进目录；勾了「立刻抓字幕」就顺手把字幕也抓了。
 *
 * 顺序：先写目录（界面上立刻可见），再抓字幕。
 * 抓字幕失败不影响已经加好的条目 —— 之后还能在列表里单独重试。
 */
async function importOnline(dataRoot, input, onLog = null) {
  const added = addVideoItem(dataRoot, input);

  if (!input?.fetchSubs) return { ...added, transcript: null };

  const item = {
    grade: added.grade,
    id: added.id,
    titleEn: added.item.englishName,
    url: added.item.url,
    transcriptFile: '',
  };

  try {
    return { ...added, transcript: await fetchTranscript(dataRoot, item, onLog) };
  } catch (err) {
    return { ...added, transcript: { ok: false, error: err.message } };
  }
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
  childEnv,
  fetchTranscript,
  importTranscript,
  writeTranscript,
  searchOnline,
  addVideoItem,
  importOnline,
};
