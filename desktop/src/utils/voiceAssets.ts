// desktop/src/utils/voiceAssets.ts
// 知识库预生成音频（VoiceAdmin 产物）的文件名约定：
//   audio/<stem>/<slug>[_content]_{zh,en}.mp3
// slug 规则必须与 VoiceAdmin（及原 Python tts_admin）完全一致，
// 页面侧才能拼出正确文件名，因此抽成共享工具，两处共用同一实现。

export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 与 VoiceAdmin pushEntry 一致：英文 slug 优先（中文会被 slugify 清空），回退 stem_序号 */
export function knowledgeItemSlug(
  titleZh: string,
  titleEn: string,
  stem: string,
  index: number,
): string {
  const slug = slugify(titleEn) || slugify(titleZh);
  return slug || `${stem}_${String(index + 1).padStart(3, '0')}`;
}

export interface KnowledgeAudioOpts {
  stem: string; // 内容文件主名，如 human-body
  index: number;
  titleZh: string;
  titleEn: string;
  part: 'title' | 'content';
  lang: 'zh' | 'en';
}

/** 音频文件相对路径（相对课程根目录）：正文加 _content 后缀 */
export function knowledgeAudioPath({
  stem,
  index,
  titleZh,
  titleEn,
  part,
  lang,
}: KnowledgeAudioOpts): string {
  const slug = knowledgeItemSlug(titleZh, titleEn, stem, index);
  const suffix = part === 'content' ? '_content' : '';
  return `audio/${stem}/${slug}${suffix}_${lang}.mp3`;
}

// ─── 英文字库（EnglishWord）───
// 音频根目录是 <courseId>/.audio（VoiceAdmin 对该项目特殊处理），
// 文件名 audio/<stem>/<slug>[_content]_{zh,en}.mp3 同构。

export function englishWordAudioPath(opts: {
  stem: string; // 章节文件主名，如 Kindergarten
  slug: string;
  part: 'title' | 'content';
  lang: 'zh' | 'en';
}): string {
  const suffix = opts.part === 'content' ? '_content' : '';
  return `.audio/${opts.stem}/${opts.slug}${suffix}_${opts.lang}.mp3`;
}

interface SlugSourceItem {
  name?: string;
  en?: string;
  zh_sentense?: string;
  en_sentense?: string;
}

/**
 * 按文件数组顺序为每个词条生成音频 slug，与 VoiceAdmin voiceIpc pushEntry 逐字符一致：
 *   slug = slugify(en) || slugify(name)，回退 stem_序号；
 *   同章节内重复单词（如「橙子/橙黄色」都是 orange）依次加 -2、-3；
 *   四个文本字段全空的条目跳过（不占 slug 位，返回空串）。
 * 词条页与 IPC 各自按同一数组顺序遍历，因此去重结果完全一致。
 */
export function buildEnglishWordSlugs(
  items: SlugSourceItem[],
  stem: string,
): string[] {
  const used = new Set<string>();
  const pick = (base: string): string => {
    if (!used.has(base)) {
      used.add(base);
      return base;
    }
    for (let n = 2; ; n += 1) {
      const candidate = `${base}-${n}`;
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
  };

  return items.map((it, i) => {
    const zh = String(it.name ?? '').trim();
    const en = String(it.en ?? '').trim();
    const sZh = String(it.zh_sentense ?? '').trim();
    const sEn = String(it.en_sentense ?? '').trim();
    if (!zh && !en && !sZh && !sEn) return '';
    let slug = slugify(en) || slugify(zh);
    if (!slug) slug = `${stem}_${String(i + 1).padStart(3, '0')}`;
    return pick(slug);
  });
}
