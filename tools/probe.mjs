// tools/probe.mjs —— 桌面化之前的「数据层体检」脚本
//
// 目的：在装 Electron 之前，先确认对数据结构和路径的理解是对的。
// 零依赖，node 直接跑；只读数据，唯一写出的文件落在 tools/_scratch/（不是真的 _tasks/）。
//
//   node tools/probe.mjs
//   node tools/probe.mjs --root 别的路径
//
// 验证的是现在 Web 端从没验证过的部分：
//   1. data.json 的章节表能不能对上 content/ 下的文件
//   2. 缺图判断准不准（前台 emoji 占位就是看 imageUrl 有没有）
//   3. ${titleZh}.jpg 这个中文文件名到底影响多少条（jsDelivr 对非 ASCII 会 404）
//   4. 生成的待办清单长什么样

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function resolveRoot() {
  const i = process.argv.indexOf('--root');
  if (i > -1 && process.argv[i + 1]) return path.resolve(process.argv[i + 1]);
  return path.resolve(here, '..', 'client', 'public', 'data');
}

const ROOT = resolveRoot();
const courseDir = path.join(ROOT, 'KnowledgeBase');
const contentDir = path.join(courseDir, 'content');
const scratchDir = path.join(here, '_scratch');

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const isAsciiSafe = (s) => /^[\x20-\x7E]+$/.test(s);

// 中文标题转拼音要字典，这里不猜；先用英文标题推 ASCII 文件名，
// 推不出来就落到 Item{index}.jpg，并如实统计有多少条需要另想办法。
function suggestFile(titleEn, index) {
  const fromEn = (titleEn || '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
  return fromEn ? `${fromEn}.jpg` : `Item${index}.jpg`;
}

console.log('数据根目录 :', ROOT);
console.log('课程目录   :', courseDir);
console.log('');

if (!fs.existsSync(courseDir)) {
  console.error('找不到课程目录，检查 --root 是不是指错了');
  process.exit(1);
}

const index = readJson(path.join(courseDir, 'data.json'));
const chapters = Array.isArray(index?.chapters) ? index.chapters : [];
console.log(`章节表     : ${chapters.length} 章`);
console.log('');

const rows = [];
const problems = [];

chapters.forEach((c, ci) => {
  const file = path.join(contentDir, c.contentLink);

  if (!fs.existsSync(file)) {
    problems.push(`「${c.name}」content/${c.contentLink} 不存在`);
    return;
  }
  let items;
  try {
    items = readJson(file);
  } catch (err) {
    problems.push(`「${c.name}」content/${c.contentLink} 解析失败：${err.message}`);
    return;
  }
  if (!Array.isArray(items)) {
    problems.push(`「${c.name}」content/${c.contentLink} 不是数组`);
    return;
  }
  if (items.length === 0) problems.push(`「${c.name}」0 条内容`);

  items.forEach((it, ii) => {
    rows.push({
      chapter: c.name,
      chapterEn: c.en,
      contentLink: c.contentLink,
      index: ii,
      title: it?.title?.zh ?? '',
      titleEn: it?.title?.en ?? '',
      imageUrl: it?.imageUrl ?? null,
      hasImage: Boolean(it?.imageUrl),
    });
  });
});

const declared = new Set(chapters.map((c) => c.contentLink));
const orphans = fs
  .readdirSync(contentDir)
  .filter((f) => f.endsWith('.json') && !declared.has(f));

const missing = rows.filter((r) => !r.hasImage);
const unsafeNames = missing.filter((r) => !isAsciiSafe(`${r.title}.jpg`));

console.log('── 统计 ─────────────────────────────');
console.log(`条目总数         : ${rows.length}`);
console.log(`已有 imageUrl    : ${rows.length - missing.length}`);
console.log(`缺图（要生成）   : ${missing.length}`);
console.log(`其中文件名非 ASCII（jsDelivr 会 404）: ${unsafeNames.length}`);
console.log('');

console.log('── 每章 ─────────────────────────────');
for (const c of chapters) {
  const all = rows.filter((r) => r.contentLink === c.contentLink);
  const miss = all.filter((r) => !r.hasImage).length;
  console.log(`  ${c.name.padEnd(8, '　')} ${String(all.length).padStart(3)} 条，缺图 ${miss}`);
}
console.log('');

if (problems.length) {
  console.log('── 发现的问题 ───────────────────────');
  problems.forEach((p) => console.log('  !', p));
  console.log('');
}
if (orphans.length) {
  console.log('── content/ 里有但章节表没引用（前台加载不到）──');
  orphans.forEach((f) => console.log('  ?', f));
  console.log('');
}

console.log('── 缺图条目样例（前 5 条）────────────');
missing.slice(0, 5).forEach((r) => {
  console.log(`  ${r.chapter} / ${r.title}`);
  console.log(`      现在会生成: ${r.title}.jpg`);
  console.log(`      ASCII 建议: ${suggestFile(r.titleEn, r.index)}`);
});
console.log('');

// ── 输出待办清单（写到 _scratch，不是真的 _tasks）────────────────
fs.mkdirSync(scratchDir, { recursive: true });
const taskFile = {
  courseId: 'KnowledgeBase',
  creditsPerImage: 20,
  generatedAt: new Date().toISOString(),
  items: missing.map((r) => ({
    chapter: r.chapter,
    contentLink: r.contentLink,
    index: r.index,
    title: r.title,
    titleEn: r.titleEn,
    fileLegacy: `${r.title}.jpg`,
    fileAscii: suggestFile(r.titleEn, r.index),
  })),
};
const out = path.join(scratchDir, 'pending-images.json');
fs.writeFileSync(out, JSON.stringify(taskFile, null, 2), 'utf8');

console.log('── 输出 ─────────────────────────────');
console.log(`待办清单已写到（草稿，不是真的 _tasks/）:`);
console.log(`  ${out}`);
console.log('');
console.log('桌面端要做的最后一件事：把 fileLegacy 换成 fileAscii，');
console.log('否则 push 上去 jsDelivr 会 404，前台还是显示 emoji。');
