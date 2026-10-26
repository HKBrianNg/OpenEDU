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
  importTranscript,
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

console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
fs.rmSync(sandbox, { recursive: true, force: true });
console.log('沙盒已清理');
process.exit(fail === 0 ? 0 : 1);
