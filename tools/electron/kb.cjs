// 知识库的读写逻辑，纯 Node、不依赖 Electron 运行时。
//
// 单独拆出来的原因：这样能用 node 直接跑测试（scripts/test-kb.cjs），
// 不用为了验证「能不能写文件」真的开一个窗口去点。
// main.cjs 只负责把它接到 IPC 上。

const path = require('node:path');
const fs = require('node:fs');
const { safeJoin, courseDir } = require('./paths.cjs');

/** 单张图的积分单价（实测：生成 1 张扣 20 积分） */
const CREDITS_PER_IMAGE = 20;

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

function loadKnowledgeBase(dataRoot, courseId = 'KnowledgeBase') {
  const dir = courseDir(dataRoot, courseId);
  const index = readJson(safeJoin(dir, 'data.json'));
  const chapters = Array.isArray(index?.chapters) ? index.chapters : [];

  const rows = [];
  const problems = [];

  chapters.forEach((c) => {
    try {
      const file = safeJoin(path.join(dir, 'content'), c.contentLink);
      if (!fs.existsSync(file)) {
        problems.push(`「${c.name}」content/${c.contentLink} 不存在`);
        return;
      }
      const items = readJson(file);
      if (!Array.isArray(items)) {
        problems.push(`「${c.name}」content/${c.contentLink} 不是数组`);
        return;
      }
      items.forEach((it, i) => {
        rows.push({
          key: `${c.contentLink}#${i}`,
          chapter: c.name ?? '',
          chapterEn: c.en ?? '',
          contentLink: c.contentLink,
          index: i,
          title: it?.title?.zh ?? '',
          titleEn: it?.title?.en ?? '',
          imageUrl: it?.imageUrl ?? null,
          hasImage: Boolean(it?.imageUrl),
        });
      });
    } catch (err) {
      problems.push(`「${c.name}」读取失败：${err.message}`);
    }
  });

  return { rows, problems, courseDir: dir };
}

function saveTasks(dataRoot, items, courseId = 'KnowledgeBase') {
  if (!Array.isArray(items) || items.length === 0) throw new Error('没有勾选任何条目');

  const dir = courseDir(dataRoot, courseId);
  const outDir = safeJoin(dir, '_tasks');
  fs.mkdirSync(outDir, { recursive: true });

  // 只保留认识的字段，别把调用方传来的东西原样落盘
  const clean = items.map((it) => ({
    chapter: String(it?.chapter ?? ''),
    contentLink: String(it?.contentLink ?? ''),
    index: Number(it?.index ?? 0),
    title: String(it?.title ?? ''),
    titleEn: String(it?.titleEn ?? ''),
    // 沿用中文名：跟现有那 2 张图一致，实测 jsDelivr 能取到
    file: `${String(it?.title ?? '')}.jpg`,
  }));

  const outFile = path.join(outDir, 'pending-images.json');
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        courseId,
        creditsPerImage: CREDITS_PER_IMAGE,
        generatedAt: new Date().toISOString(),
        items: clean,
      },
      null,
      2
    ),
    'utf8'
  );

  return { ok: true, path: outFile, count: clean.length };
}

module.exports = { loadKnowledgeBase, saveTasks, safeJoin, courseDir, CREDITS_PER_IMAGE };
