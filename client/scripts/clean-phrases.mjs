import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const CONTENT_DIR = 'public/data/EnglishShorts/content';
const DRY = process.argv.includes('--dry');

function normalize(item) {
  // 直接取 title，丢弃 content
  const en = item.title?.en ?? '';
  const name = item.title?.zh ?? '';
  return { en, name };
}

async function main() {
  const files = (await readdir(CONTENT_DIR))
    .filter(f => f.endsWith('.json'))
    .sort();

  if (!files.length) {
    console.warn(`⚠️ 没找到文件：${CONTENT_DIR}`);
    return;
  }

  let touched = 0;
  for (const file of files) {
    const path = join(CONTENT_DIR, file);
    const raw = await readFile(path, 'utf8');
    const data = JSON.parse(raw);

    const arr = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(arr)) {
      console.warn(`  跳过 ${file}：不是数组也没有 items 字段`);
      continue;
    }

    const next = arr.map(normalize);

    if (DRY) {
      console.log(`  ✱ ${file} 将改为 ${next.length} 条扁平记录（dry run）`);
    } else {
      const out = JSON.stringify(next, null, 2) + '\n';
      await writeFile(path, out, 'utf8');
      console.log(`  ✔ ${file} → ${next.length} 条`);
    }
    touched++;
  }

  console.log(
    DRY ? `\n[dry run] 预计改动 ${touched} 个文件` : `\n完成！共处理 ${touched} 个文件`
  );
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});