// 给字表补繁体字段：每个字算出繁体字形 + 繁体例词，直接写回 gradeN.json。
//
//   npm i opencc-js hanzi-writer-data --no-save
//   node scripts/gen-traditional.mjs
//
// 为什么按「例词」转而不是按「单字」转：
// 简繁不是一对一，「发」可以是「發」（发现）也可以是「髮」（头发），
// 单字转换只能猜一个，按词转换才能拿到义项对应的那个繁体字。
// 所以这里先转整个例词，再从转好的例词里把本字那一格取出来。

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const OpenCC = require('opencc-js');
const convert = OpenCC.Converter({ from: 'cn', to: 'tw' });

const here = path.dirname(fileURLToPath(import.meta.url));
const charDir = path.resolve(here, '../src/books/HanziWriting/data/chars');
const dataDir = path.resolve(here, '../node_modules/hanzi-writer-data');

// OpenCC 偶尔会给出数据包里没有的异体字形，这里换成包里有的那个
const GLYPH_FIX = { 溼: '濕' };

const files = fs
  .readdirSync(charDir)
  .filter((f) => /^grade\d+\.json$/.test(f))
  .sort();

let total = 0;
const problems = [];

for (const file of files) {
  const full = path.join(charDir, file);
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'));

  for (const [cat, list] of Object.entries(raw)) {
    for (const entry of list) {
      total++;
      let wordTw = convert(entry.w);
      for (const [from, to] of Object.entries(GLYPH_FIX)) {
        wordTw = wordTw.split(from).join(to);
      }

      // 本字在例词里的位置 → 取繁体例词同一格的字符
      const at = entry.w.indexOf(entry.c);
      const tw = at >= 0 ? wordTw[at] : convert(entry.c);

      if (!fs.existsSync(path.join(dataDir, `${tw}.json`))) {
        problems.push(`${file} ${cat} 「${entry.c}」→「${tw}」包里没这个字形`);
        continue;
      }
      if (at >= 0 && !wordTw.includes(tw)) {
        problems.push(`${file} ${cat} 「${entry.c}」繁体例词「${wordTw}」里没有「${tw}」`);
        continue;
      }

      entry.tw = tw;
      entry.wordTw = wordTw;
    }
  }

  // 手写成行内格式，保持和原来一致的排版
  const cats = Object.keys(raw);
  const body = cats
    .map((cat, i) => {
      const rows = raw[cat].map((e) => {
        const parts = [];
        for (const [k, v] of Object.entries(e)) {
          // 繁体字段统一插在简体例词后面，不在原位置再写一遍
          if (k === 'tw' || k === 'wordTw') continue;
          parts.push(`"${k}": ${JSON.stringify(v)}`);
          if (k === 'w') {
            parts.push(`"tw": "${e.tw}"`);
            parts.push(`"wordTw": "${e.wordTw}"`);
          }
        }
        return `    { ${parts.join(', ')} }`;
      });
      // 组结尾的逗号在这里给，下面 join 只负责空行，别再加一个
      const tail = i === cats.length - 1 ? '  ]' : '  ],';
      return `  "${cat}": [\n${rows.join(',\n')}\n${tail}`;
    })
    .join('\n\n');

  fs.writeFileSync(full, `{\n${body}\n}\n`, 'utf8');
}

console.log(`繁体字段  src\\books\\HanziWriting\\data\\chars\\gradeN.json\n`);
console.log(`  处理 ${total} 条\n`);
if (problems.length) {
  console.log(`⚠ ${problems.length} 处要处理：`);
  for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
  process.exit(1);
}
console.log(`  全部有对应字形\n`);
