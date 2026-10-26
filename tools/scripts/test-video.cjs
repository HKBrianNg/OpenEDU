// 验证视频字幕模块：读目录、文件名推导、vtt 解析、写回台词文件。
//
//   node scripts/test-video.cjs
//
// 抓字幕本身要联网，不在这里测（界面上手动跑）。这里只测纯逻辑：
// 用真实的 EnglishVideo 数据建沙盒，再来一遍读 + 写。

const fs = require('node:fs');
const path = require('node:path');
const {
  loadCatalog,
  suggestFileName,
  parseVtt,
  toClock,
  childEnv,
  importTranscript,
  searchOnline,
  addVideoItem,
  importOnline,
} = require('../electron/video.cjs');

const root = path.join(__dirname, '..');
const sandbox = path.join(root, '_scratch', 'vsandbox');
const real = path.join(root, '..', 'client', 'public', 'data', 'EnglishVideo');

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}${extra ? '  ' + extra : ''}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${extra ? '  ' + extra : ''}`);
  }
}

// ── 建沙盒（复制真实 EnglishVideo）─────────────────────────────────
fs.rmSync(sandbox, { recursive: true, force: true });
fs.mkdirSync(sandbox, { recursive: true });
const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
};
copyDir(real, path.join(sandbox, 'EnglishVideo'));
console.log('沙盒已就绪\n');

// ── 读目录 ─────────────────────────────────────────────────────────
console.log('读目录：');
const cat = loadCatalog(sandbox);
check('读到视频', cat.rows.length > 0, `${cat.rows.length} 条`);
check('年级无问题', cat.problems.length === 0, cat.problems.join('；'));
check(
  '字段完整',
  cat.rows.every((r) => r.grade && r.gradeName && r.titleEn !== undefined)
);
const done = cat.rows.filter((r) => r.hasTranscript);
check('能区分已有台词', done.length > 0, `${done.length} 条已有台词`);
check(
  '已有台词能数出句数',
  done.every((r) => r.lineCount > 0),
  `例：${done[0]?.lineCount} 句`
);

// ── 文件名推导 ─────────────────────────────────────────────────────
console.log('\n文件名：');
check(
  '帕斯卡拼接',
  suggestFileName('Peppa Pig: Muddy Puddles', 1) === 'PeppaPigMuddyPuddles.json',
  suggestFileName('Peppa Pig: Muddy Puddles', 1)
);
check(
  '纯中文退化成 Item{id}',
  suggestFileName('小猪佩奇', 7) === 'Item7.json',
  suggestFileName('小猪佩奇', 7)
);

// ── 时间格式 ───────────────────────────────────────────────────────
console.log('\n时间格式：');
check('时分秒 → 分秒', toClock('00:01:02.500') === '01:02', toClock('00:01:02.500'));
check('分秒原样', toClock('00:02') === '00:02', toClock('00:02'));

// ── vtt 解析 ───────────────────────────────────────────────────────
console.log('\nvtt 解析：');
const vtt = [
  'WEBVTT',
  'Kind: captions',
  'Language: en',
  '',
  '00:00:02.000 --> 00:00:04.000',
  'I am Peppa Pig.',
  '',
  '00:00:04.000 --> 00:00:06.500',
  'This is my little brother, George.',
  '',
  '00:00:06.500 --> 00:00:08.000',
  '<c>This is my little brother, George.</c>',
  '',
  '00:00:08.000 --> 00:00:10.000',
  '<00:00:08.000><c>This is</c><00:00:08.500><c>fun</c>',
  '',
].join('\n');

const lines = parseVtt(vtt);
check('解析出句子', lines.length === 3, `${lines.length} 句`);
check('剥掉行内标签', lines.every((l) => !/[<>]/.test(l.en)), lines[2]?.en);
// 卡拉 OK 式字幕删标签时不能把词粘在一起（<c>This is</c><c>fun</c> → "This is fun"）
check('标签处补空格不粘连', lines[2]?.en === 'This is fun', lines[2]?.en);
check('start 用分秒', lines[0].start === '00:02', lines[0].start);
check('index 从 1 开始', lines[0].index === 1);
check('中文留空待补', lines.every((l) => l.zh === ''));

// ── 写回台词 ───────────────────────────────────────────────────────
// 当前 85 条视频全都有台词了，所以这里人为删掉一个台词文件，
// 造出「缺台词」状态再走一遍抓取后的写回流程。
console.log('\n写回台词：');
const target = cat.rows[0];
const targetFile = path.join(
  sandbox,
  'EnglishVideo',
  target.grade,
  'transcripts',
  path.basename(target.transcriptFile)
);
fs.rmSync(targetFile, { force: true });
const missing = loadCatalog(sandbox).rows.find((r) => r.key === target.key);
check('删掉台词文件后变缺台词', missing.hasTranscript === false);

if (true) {
  const gradeDir = path.join(sandbox, 'EnglishVideo', target.grade);
  const outDir = path.join(gradeDir, 'transcripts');
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = suggestFileName(target.titleEn, target.id);
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify({ lines }, null, 2), 'utf8');

  const gradeFile = path.join(gradeDir, `${target.grade}.json`);
  const data = JSON.parse(fs.readFileSync(gradeFile, 'utf8'));
  const it = data.items.find((x) => x.id === target.id);
  it.transcriptFile = `transcripts/${fileName}`;
  fs.writeFileSync(gradeFile, JSON.stringify(data, null, 2), 'utf8');

  const after = loadCatalog(sandbox);
  const now = after.rows.find((r) => r.key === target.key);
  check('写入后状态变已有台词', now.hasTranscript === true);
  check('句数对得上', now.lineCount === lines.length, `${now.lineCount} 句`);
} else {
  check('有缺台词的视频可测', false);
}

// ── 导入本地字幕（yt-dlp 抓不到时的兜底）──────────────────────────
console.log('\n导入本地字幕：');
const impTarget = loadCatalog(sandbox).rows[1] ?? loadCatalog(sandbox).rows[0];
const srtFile = path.join(root, '_scratch', 'test.srt');
fs.writeFileSync(
  srtFile,
  ['1', '00:00:03,000 --> 00:00:05,000', 'Hello there', '', '2', '00:00:05,000 --> 00:00:07,000', 'Second line', ''].join(
    '\n'
  ),
  'utf8'
);
const imp = importTranscript(sandbox, impTarget, srtFile);
check('导入 srt 成功', imp.ok === true, `${imp.lines} 句 → ${imp.file}`);
const afterImp = loadCatalog(sandbox).rows.find((r) => r.key === impTarget.key);
check('导入后状态为已有台词', afterImp.hasTranscript === true);
check('句数对得上', afterImp.lineCount === 2, `${afterImp.lineCount} 句`);

let blocked = false;
try {
  importTranscript(sandbox, impTarget, path.join(root, '_scratch', 'nope.txt'));
} catch {
  blocked = true;
}
check('非 vtt/srt 被拒', blocked);

// 下面这段要 await（异步测试），CJS 不能顶层 await，所以包一层
async function rest() {
// ── 从网上导入 ─────────────────────────────────────────────────────
// 搜索用假的命令执行器，不真跑 yt-dlp（那要联网，而且慢）。
console.log('\n网上搜索（假 yt-dlp）：');
const fakeRunner = (stdout) => async () => ({ code: 0, stdout });

const stdOut = [
  'abc123XY\tPeppa Pig - Muddy Puddles\tPeppa Pig Official Channel\t5:02',
  'zzz999QQ\tBluey - Keepy Uppy\tBluey Official\t7:30',
  'short \t标题里有制表符的怪行\tSomeone\t1:00', // id 太短，应被当成噪声筛掉
  'abc123XY\t重复的一条\tDup\t5:02',
].join('\n');

const found = await searchOnline('Peppa Pig', { runner: fakeRunner(stdOut) });
check('搜到结果', found.length === 2, `${found.length} 条`);
check('id / 标题 / 频道 / 时长都解析出来了', found[0].videoId === 'abc123XY' && found[0].duration === '5:02', found[0].title);
check('拼出视频 URL', found[0].url === 'https://www.youtube.com/watch?v=abc123XY');
check('同一 id 只保留一条', new Set(found.map((r) => r.videoId)).size === found.length);
check('形状不对的行被筛掉', found.every((r) => r.videoId.length >= 6));

const empty = await searchOnline('nothing', { runner: fakeRunner('') });
check('空结果不报错', Array.isArray(empty) && empty.length === 0);

let kwBlocked = false;
try {
  await searchOnline('   ', { runner: fakeRunner('') });
} catch {
  kwBlocked = true;
}
check('空关键词直接报错', kwBlocked);

let rateLimited = false;
try {
  await searchOnline('x', { runner: async () => ({ code: 1, stdout: 'ERROR: HTTPError 429 Too Many Requests' }) });
} catch (e) {
  rateLimited = /限流/.test(e.message);
}
check('429 翻译成人话', rateLimited);

console.log('\n加新条目（沙盒）：');
const addGrade = 'Kingdergarten';
const gradeFileBak = fs.readFileSync(
  path.join(sandbox, 'EnglishVideo', addGrade, `${addGrade}.json`),
  'utf8'
);
const beforeCount = loadCatalog(sandbox).rows.length;

const added = addVideoItem(sandbox, {
  grade: addGrade,
  url: 'https://www.youtube.com/watch?v=newvid1234',
  titleEn: 'Peppa Pig: The New One',
  titleZh: '小猪佩奇：新的一集',
  series: 'Peppa Pig',
  duration: '5:16',
  channel: 'Peppa Pig Official Channel',
  platform: 'YouTube',
});
check('拿到新 id', added.id > 0, `#${added.id}`);
// 搜索结果里本来就有这些信息，不能丢
check('时长存下来了', added.item.durationPerEpisode === '5:16', added.item.durationPerEpisode);
check('频道存下来了', added.item.channel === 'Peppa Pig Official Channel');
check('平台写的是 YouTube', added.item.platform === 'YouTube');
check('series 没被频道名顶掉', added.item.series === 'Peppa Pig', added.item.series);
check('列表多了一条', loadCatalog(sandbox).rows.length === beforeCount + 1);

const addedRow = loadCatalog(sandbox).rows.find((r) => r.id === added.id && r.grade === addGrade);
check('前台能看到新条目', Boolean(addedRow), addedRow?.titleEn);
check('中文名也存下来了', addedRow?.titleZh === '小猪佩奇：新的一集');
check('没串台词的标记', addedRow?.hasTranscript === false);

const newSrc = fs.readFileSync(path.join(sandbox, 'EnglishVideo', addGrade, `${addGrade}.json`), 'utf8');
// 注意：视频这边的 JSON 是 LF（跟知识库那边的 CRLF 不一样），
// 所以这里不能写死 CRLF，得「跟原文件保持一致」。
const eolStyle = (s) => (s.includes('\r\n') ? 'CRLF' : 'LF');
check(
  '换行风格跟原文件一致',
  eolStyle(newSrc) === eolStyle(gradeFileBak),
  `${eolStyle(gradeFileBak)} → ${eolStyle(newSrc)}`
);
check(
  '文件末尾换行没被吃掉',
  /(\r?\n)\s*$/.test(gradeFileBak) === /(\r?\n)\s*$/.test(newSrc),
  `原: ${JSON.stringify(gradeFileBak.slice(-2))} → 新: ${JSON.stringify(newSrc.slice(-2))}`
);
// 除了新增条目之外，原文件的其它字节不该动 —— diff 应该只有一段
const before = JSON.parse(gradeFileBak).items.map((x) => JSON.stringify(x));
const after = JSON.parse(newSrc).items.map((x) => JSON.stringify(x));
check(
  '原有条目一个字节都没动',
  JSON.stringify(before) === JSON.stringify(after.slice(0, before.length))
);

const dup = () => {
  try {
    addVideoItem(sandbox, { grade: addGrade, url: 'https://www.youtube.com/watch?v=newvid1234', titleEn: 'dup' });
    return null;
  } catch (e) {
    return e.message;
  }
};
check('同一条视频不会重复加', Boolean(dup()));

const badUrl = () => {
  try {
    addVideoItem(sandbox, { grade: addGrade, url: 'not-a-url', titleEn: 'x' });
    return null;
  } catch (e) {
    return e.message;
  }
};
check('非法 URL 被拒', Boolean(badUrl()));

const badGrade = () => {
  try {
    addVideoItem(sandbox, { grade: '', url: 'https://www.youtube.com/watch?v=x1x2x3x4', titleEn: 'x' });
    return null;
  } catch (e) {
    return e.message;
  }
};
check('没选年级被拒', Boolean(badGrade()));

const escapeGrade = () => {
  try {
    addVideoItem(sandbox, { grade: '../../Users', url: 'https://www.youtube.com/watch?v=y1y2y3y4', titleEn: 'x' });
    return null;
  } catch (e) {
    return e.message;
  }
};
check('年级目录穿越被拒', Boolean(escapeGrade()));

console.log('\n在线导入（不抓字幕）：');
const imp2 = await importOnline(sandbox, {
  grade: addGrade,
  url: 'https://www.youtube.com/watch?v=anothervid9',
  titleEn: 'Numberblocks: Ten Again',
  fetchSubs: false, // 抓字幕要联网跑 yt-dlp，不在这里测
});
check('只加目录不抓字幕', imp2.transcript === null && imp2.id > 0, `#${imp2.id}`);

console.log('\n子进程环境：');
const env = childEnv();
check('NODE_OPTIONS 被清掉', !('NODE_OPTIONS' in env));
check('其余环境变量保留', typeof env.PATH === 'string' && env.PATH.length > 0);
}

rest().then(() => {
  console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
  fs.rmSync(sandbox, { recursive: true, force: true });
  console.log('沙盒已清理');
  process.exit(fail === 0 ? 0 : 1);
});
