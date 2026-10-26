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

/**
 * 把一张图存进 content/，并把 imageUrl 回写到条目上。
 *
 * 顺序很重要：先校验 index、再写图、最后写 JSON。
 * 反过来做的话，JSON 写失败会留下一张没人引用的孤儿图。
 */
function saveImage(dataRoot, input, buffer, courseId = 'KnowledgeBase') {
  const dir = courseDir(dataRoot, courseId);
  const contentDir = safeJoin(dir, 'content');

  const file = String(input?.file ?? '').trim();
  if (!file) throw new Error('文件名是空的');
  if (/[\\/:*?"<>|]/.test(file)) throw new Error(`文件名不合法：${file}`);
  if (!/\.(jpe?g|png|webp)$/i.test(file)) throw new Error(`文件名必须以图片后缀结尾：${file}`);

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('没有图片数据');

  // ── 1) 先确认这条目真的存在，别写完了发现回写不了 ──
  const contentLink = String(input?.contentLink ?? '').trim();
  if (!contentLink) throw new Error('没指定 contentLink');
  const jsonPath = safeJoin(contentDir, contentLink);
  const src = fs.readFileSync(jsonPath, 'utf8');
  const items = JSON.parse(src);
  if (!Array.isArray(items)) throw new Error(`${contentLink} 不是数组`);

  const i = Number(input?.index ?? -1);
  if (!Number.isInteger(i) || i < 0 || i >= items.length) {
    throw new Error(`条目下标越界：${input?.index}（共 ${items.length} 条）`);
  }

  // ── 2) 写图 ──
  const target = safeJoin(contentDir, file);
  fs.writeFileSync(target, buffer);

  // ── 3) 回写 imageUrl ──
  // 实测过：这些文件是 2 空格缩进 + CRLF，JSON.stringify(…, null, 2) 再换回 CRLF
  // 跟原文件字节完全一致，所以整文件重写是安全的（diff 只有 imageUrl 那一行）。
  items[i].imageUrl = file;
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2).replace(/\n/g, eol), 'utf8');

  return {
    ok: true,
    file,
    bytes: buffer.length,
    contentLink,
    index: i,
    title: items[i]?.title?.zh ?? '',
  };
}

module.exports = {
  loadKnowledgeBase,
  saveTasks,
  saveImage,
  safeJoin,
  courseDir,
  CREDITS_PER_IMAGE,
};
