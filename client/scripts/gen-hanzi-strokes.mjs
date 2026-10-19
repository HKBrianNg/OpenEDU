// 从 hanzi-writer-data 抽出用到的字，生成打包进源码的笔画数据 + 字表。
//
//   npm i hanzi-writer-data --no-save
//   node scripts/gen-hanzi-strokes.mjs
//
// 输入：手写的 data/chars/gradeN.json（字 + 分类 + 例词 + 英文释义）
// 拼音不手写，交给 pinyin-pro 按词典生成，声调不会错。
//
// 输出：
//   data/characters.generated.ts        全部字的元数据（含拼音、笔画数），静态引入
//   data/strokes/simplified/gradeN.js   每年级简体笔画数据，按需动态引入
//   data/strokes/traditional/gradeN.js  同一批字的繁体笔画数据
//   data/strokes/*/gradeN.d.ts          类型声明
//
// 繁体字段（tw / wordTw）来自 scripts/gen-traditional.mjs，本脚本只负责取笔画。
//
// 笔画数据写成 .js 而非 .ts：全部年级加起来有好几 MB 对象字面量，
// 写成 .ts 会让 tsc 每次都解析这些大文件。数据不需要类型检查，给 .d.ts 就够了。
//
// 数据来源 hanzi-writer-data（源自 Make Me A Hanzi，字形基于 Arphic 公开授权字体）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const root = path.resolve(fileURLToPath(import.meta.url), '../..');
const bookDir = path.join(root, 'src/books/HanziWriting');
const sourceDir = path.join(bookDir, 'data/chars');
const strokeDir = path.join(bookDir, 'data/strokes');
const simplifiedDir = path.join(strokeDir, 'simplified');
const traditionalDir = path.join(strokeDir, 'traditional');
const metaFile = path.join(bookDir, 'data/characters.generated.ts');
const dataDir = path.join(root, 'node_modules/hanzi-writer-data');

// 多音字：词典给的是单字默认读音，课本里最常见的往往不是那个。
// 比如「了」词典给 liǎo，一二年级教的「好了」读 le。这张表是人工校过的。
const PINYIN_OVERRIDES = {
  了: 'le', 的: 'de', 地: 'dì', 为: 'wéi', 长: 'cháng', 少: 'shǎo', 只: 'zhī',
  数: 'shù', 发: 'fà', 干: 'gān', 行: 'xíng', 乐: 'lè', 重: 'zhòng', 觉: 'jué',
  空: 'kōng', 相: 'xiāng', 教: 'jiào', 朝: 'zhāo', 还: 'hái', 兴: 'xīng',
  // 二年级用的几个：种树、很脏、很累
  种: 'zhòng', 脏: 'zāng', 累: 'lèi',
  划: 'huà', 缝: 'féng', 泊: 'bó', 藏: 'cáng', 塞: 'sài', 豁: 'huò',
  揣: 'chuǎi', 逮: 'dài', 阙: 'què', 缥: 'piāo',
  分: 'fēn', 都: 'dōu', 得: 'dé', 答: 'dá', 扇: 'shàn', 斗: 'dòu',
  华: 'huá', 宁: 'níng', 曾: 'céng', 弹: 'tán', 折: 'zhé', 血: 'xuè',
  降: 'jiàng', 传: 'chuán', 卷: 'juàn', 应: 'yīng', 处: 'chù', 和: 'hé',
  着: 'zhe', 差: 'chā', 更: 'gèng', 调: 'tiáo', 几: 'jǐ', 假: 'jiǎ',
  间: 'jiān', 角: 'jiǎo', 没: 'méi', 难: 'nán', 片: 'piàn', 铺: 'pū',
  曲: 'qū', 散: 'sàn', 似: 'sì', 宿: 'sù', 踏: 'tà', 挑: 'tiāo', 系: 'xì',
  载: 'zài', 占: 'zhàn', 正: 'zhèng', 转: 'zhuǎn', 钻: 'zuān', 只: 'zhī',
};

function pinyinOf(char) {
  if (PINYIN_OVERRIDES[char]) return PINYIN_OVERRIDES[char];
  const got = pinyin(char, { toneType: 'symbol', type: 'array' })[0];
  if (!got) throw new Error(`取不到拼音：${char}`);
  return got;
}

// 字形是 1024×1024 的网格，坐标取整省掉一半体积，肉眼没区别
const roundPath = (d) => d.replace(/-?\d+(?:\.\d+)?/g, (n) => String(Math.round(Number(n))));
const roundMedians = (ms) => ms.map((line) => line.map(([x, y]) => [Math.round(x), Math.round(y)]));

if (!fs.existsSync(dataDir)) {
  console.error(`找不到 ${dataDir}\n先执行：npm i hanzi-writer-data --no-save`);
  process.exit(1);
}
if (!fs.existsSync(sourceDir)) {
  console.error(`找不到字表源文件目录 ${sourceDir}`);
  process.exit(1);
}

const gradeFiles = fs
  .readdirSync(sourceDir)
  .filter((f) => /^grade\d+\.json$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (!gradeFiles.length) {
  console.error('data/chars/ 下没有 gradeN.json');
  process.exit(1);
}

const seen = new Map(); // char → 已出现在哪个年级
const missing = [];
const grades = [];
const loadGlyph = (char) => {
  const file = path.join(dataDir, `${char}.json`);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    strokes: data.strokes.length,
    strokeData: {
      strokes: data.strokes.map(roundPath),
      medians: roundMedians(data.medians),
    },
  };
};

for (const file of gradeFiles) {
  const grade = Number(file.match(/\d+/)[0]);
  const raw = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
  const entries = [];

  for (const [groupCat, list] of Object.entries(raw)) {
    for (const item of list) {
      const char = item.c;
      if (!char) throw new Error(`${file} 里有一条没写 c`);
      if (seen.has(char)) {
        throw new Error(`「${char}」在 ${seen.get(char)} 年级和 ${grade} 年级都出现了，字表要去重`);
      }
      seen.set(char, grade);

      const simplified = loadGlyph(char);
      if (!simplified) {
        missing.push(char);
        continue;
      }
      // 繁体是另一个字形、另一套笔画，笔画数通常比简体多
      const traditionalChar = item.tw;
      const traditional = traditionalChar ? loadGlyph(traditionalChar) : null;
      if (traditionalChar && !traditional) {
        missing.push(`${char}→${traditionalChar}(繁体)`);
        continue;
      }

      // 分组名就是主分类，cat 里可以再追加别的分类
      const cats = [groupCat, ...(item.cat || [])];

      entries.push({
        char,
        pinyin: pinyinOf(char),
        word: item.w,
        en: item.en,
        grade,
        cats,
        strokes: simplified.strokes,
        strokeData: simplified.strokeData,
        traditional: traditionalChar ?? char,
        wordTraditional: item.wordTw ?? item.w,
        strokesTraditional: traditional ? traditional.strokes : simplified.strokes,
        strokeDataTraditional: traditional ? traditional.strokeData : simplified.strokeData,
      });
    }
  }

  grades.push({ grade, entries });
}

if (missing.length) {
  console.error(`这些字在 hanzi-writer-data 里没有：${missing.join(' ')}`);
  process.exit(1);
}

// ── 笔画数据：简体、繁体各一套，每年级一个 .js + 一个 .d.ts ────────────
const glyphDts =
  `// 自动生成。真实内容在同名的 .js 里。\n` +
  `import type { CharStrokes } from '../../../types';\n\n` +
  `declare const data: Record<string, CharStrokes>;\nexport default data;\n`;

for (const dir of [simplifiedDir, traditionalDir]) {
  fs.mkdirSync(dir, { recursive: true });
  // 清掉旧的生成物，免得删年级后残留
  for (const f of fs.readdirSync(dir)) {
    if (/^grade\d+\.(js|d\.ts)$/.test(f)) fs.unlinkSync(path.join(dir, f));
  }
}
// 更早的版本把文件直接摊在 strokes/ 下，一并清掉
for (const f of fs.readdirSync(strokeDir)) {
  if (/^grade\d+\.(js|d\.ts)$/.test(f)) fs.unlinkSync(path.join(strokeDir, f));
}

function emitStrokes(dir, label, charKey, dataKey) {
  let bytes = 0;
  for (const { grade, entries } of grades) {
    const lines = entries.map(
      (e) => `  ${JSON.stringify(e[charKey])}:${JSON.stringify(e[dataKey])},`,
    );
    const js =
      `// 自动生成，请勿手改。由 scripts/gen-hanzi-strokes.mjs 导出。\n` +
      `// ${grade} 年级 ${entries.length} 个字的${label}笔画数据。\n` +
      `// 字形数据版权：Make Me A Hanzi / Arphic Public License。\n` +
      `export default {\n${lines.join('\n')}\n};\n`;
    fs.writeFileSync(path.join(dir, `grade${grade}.js`), js, 'utf8');
    fs.writeFileSync(path.join(dir, `grade${grade}.d.ts`), glyphDts, 'utf8');
    bytes += Buffer.byteLength(js, 'utf8');
  }
  return bytes;
}

let strokeBytes = emitStrokes(simplifiedDir, '简体', 'char', 'strokeData');
strokeBytes += emitStrokes(traditionalDir, '繁体', 'traditional', 'strokeDataTraditional');

// ── 字表元数据 ────────────────────────────────────────────────────────
const meta =
  `// 自动生成，请勿手改。由 scripts/gen-hanzi-strokes.mjs 导出。\n` +
  `// 拼音由 pinyin-pro 按词典生成，多音字走脚本里的 PINYIN_OVERRIDES。\n\n` +
  `import type { CharCategory, HanziChar } from '../types';\n\n` +
  grades
    .map(
      ({ grade, entries }) =>
        `const GRADE_${grade}: HanziChar[] = [\n` +
        entries
          .map(
            (e) =>
              `  { char: ${JSON.stringify(e.char)}, traditional: ${JSON.stringify(e.traditional)}, pinyin: ${JSON.stringify(e.pinyin)}, word: ${JSON.stringify(e.word)}, wordTraditional: ${JSON.stringify(e.wordTraditional)}, en: ${JSON.stringify(e.en)}, grade: ${grade}, cats: ${JSON.stringify(e.cats)} as CharCategory[], strokes: ${e.strokes}, strokesTraditional: ${e.strokesTraditional} },`,
          )
          .join('\n') +
        `\n];\n`,
    )
    .join('\n') +
  `\n/** 1–6 年级的全部字，按年级分组 */\nexport const GRADE_CHARS: Record<number, HanziChar[]> = {\n` +
  grades.map(({ grade }) => `  ${grade}: GRADE_${grade},`).join('\n') +
  `\n};\n\n/** 全部年级的年级号 */\nexport const AVAILABLE_GRADES = [${grades.map((g) => g.grade).join(', ')}];\n`;

fs.writeFileSync(metaFile, meta, 'utf8');

const total = grades.reduce((n, g) => n + g.entries.length, 0);
console.log(`字表  ${path.relative(root, metaFile)}`);
console.log(`笔画  ${path.relative(root, strokeDir)}\\gradeN.js`);
console.log('');
const kbOf = (arr) =>
  (Buffer.byteLength(JSON.stringify(arr), 'utf8') / 1024).toFixed(0);
for (const { grade, entries } of grades) {
  const simp = kbOf(entries.map((e) => e.strokeData));
  const trad = kbOf(entries.map((e) => e.strokeDataTraditional));
  console.log(
    `  ${grade} 年级  ${String(entries.length).padStart(4)} 字   简体 ${simp.padStart(4)} KB   繁体 ${trad.padStart(4)} KB`,
  );
}
console.log(`  ───────────────────────────────────`);
console.log(`  合计     ${String(total).padStart(4)} 字   两套共 ${(strokeBytes / 1024 / 1024).toFixed(2)} MB`);
