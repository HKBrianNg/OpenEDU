// 验证知识库的读写逻辑真的能用 —— 不需要开 Electron 窗口。
//
//   node scripts/test-kb.cjs
//
// 用沙盒目录试，不污染真实数据：把 data.json 和 content/ 复制到
// tools/_scratch/sandbox/ 再操作。

const fs = require('node:fs');
const path = require('node:path');
const {
  loadKnowledgeBase,
  saveTasks,
  safeJoin,
  courseDir,
} = require('../electron/kb.cjs');

const root = path.join(__dirname, '..');
const sandbox = path.join(root, '_scratch', 'sandbox', 'KnowledgeBase');
const real = path.join(root, '..', 'client', 'public', 'data', 'KnowledgeBase');

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

// ── 准备沙盒 ───────────────────────────────────────────────────────
fs.rmSync(path.join(root, '_scratch', 'sandbox'), { recursive: true, force: true });
fs.mkdirSync(path.join(sandbox, 'content'), { recursive: true });
fs.copyFileSync(path.join(real, 'data.json'), path.join(sandbox, 'data.json'));
for (const f of fs.readdirSync(path.join(real, 'content'))) {
  fs.copyFileSync(path.join(real, 'content', f), path.join(sandbox, 'content', f));
}
console.log('沙盒已就绪\n');

const dataRoot = path.join(root, '_scratch', 'sandbox');

// ── 读 ─────────────────────────────────────────────────────────────
console.log('读：');
const loaded = loadKnowledgeBase(dataRoot);
check('读到条目', loaded.rows.length > 0, `${loaded.rows.length} 条`);
check('章节无问题', loaded.problems.length === 0, loaded.problems.join('；'));
check(
  '条目字段完整',
  loaded.rows.every((r) => r.chapter && r.contentLink && typeof r.index === 'number')
);
const missing = loaded.rows.filter((r) => !r.hasImage);
check('能区分缺图', missing.length > 0, `缺图 ${missing.length} 条`);

// ── 写 ─────────────────────────────────────────────────────────────
console.log('\n写：');
const pick = missing.slice(0, 3);
const saved = saveTasks(dataRoot, pick);
check('返回成功', saved.ok === true);
check('文件真的落盘', fs.existsSync(saved.path), saved.path);
const written = JSON.parse(fs.readFileSync(saved.path, 'utf8'));
check('条目数一致', written.items.length === pick.length, `${written.items.length} 条`);
check('带积分单价', written.creditsPerImage === 20);
check(
  '文件名沿用中文名',
  written.items[0].file === `${pick[0].title}.jpg`,
  written.items[0].file
);

// ── 安全：路径穿越必须被挡住 ───────────────────────────────────────
console.log('\n安全：');
let blocked = false;
try {
  safeJoin(sandbox, '../outside/evil.json');
} catch {
  blocked = true;
}
check('挡住 ../ 穿越', blocked);

blocked = false;
try {
  courseDir(dataRoot, 'NotAllowedCourse');
} catch {
  blocked = true;
}
check('挡住白名单外的课程', blocked);

blocked = false;
try {
  saveTasks(dataRoot, []);
} catch {
  blocked = true;
}
check('空清单拒绝写入', blocked);

// ── 结果 ───────────────────────────────────────────────────────────
console.log(`\n通过 ${pass} 项，失败 ${fail} 项`);
fs.rmSync(path.join(root, '_scratch', 'sandbox'), { recursive: true, force: true });
console.log('沙盒已清理');
process.exit(fail === 0 ? 0 : 1);
