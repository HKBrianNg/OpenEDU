// client/src/books/EnglishVideo/utils/cloze.ts
//
// 填空练习的纯逻辑：挑要挖的词、渲染挖空句、比对答案。
// 单独放一个文件：组件文件只导出组件（fast refresh 要求），纯逻辑也好写单测。

export const BLANK = '____';

/**
 * 功能词表。挑挖空词时跳过这些 —— 挖掉 "the" "is" 这种没有考察意义。
 * 只放冠词/介词/代词/助动词/连词/语气词，实义动词和名词都留着。
 */
const STOPWORDS = new Set([
  'a', 'an', 'the',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'but', 'so', 'as', 'by',
  'from', 'up', 'down', 'out', 'off', 'over', 'into', 'than', 'too', 'very', 'just',
  'also', 'not', 'no', 'yes',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'this', 'that', 'these', 'those', 'here', 'there', 'now', 'then',
  'do', 'does', 'did', 'can', 'will', 'would', 'could', 'should', 'shall', 'may',
  'might', 'must', 'have', 'has', 'had',
  'oh', 'hey', 'hi', 'hello', 'yeah', 'ok', 'okay',
]);

/**
 * 自动挑一个要挖空的词：跳过句首和功能词，取最长的那个（信息量最大）。
 * 全句都是功能词时，退化成最后一个词。
 */
export function pickBlank(en: string): string {
  const words = en.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
  if (words.length === 0) return '';

  // 跳过句首：挖掉开头第一个词读起来最别扭
  const rest = words.slice(1);
  const candidates = rest.filter((w) => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()));

  if (candidates.length > 0) {
    return candidates.reduce((best, w) => (w.length > best.length ? w : best));
  }
  // 退化：整句没有合适的实词，挖最后一个词
  return words[words.length - 1];
}

/** 把句子里的 blank 那段换成下划线；blank 为空或没匹配上则原样返回 */
export function buildCloze(en: string, blank: string): string {
  if (!blank) return en;
  const idx = en.toLowerCase().indexOf(blank.toLowerCase());
  if (idx < 0) return en;
  return en.slice(0, idx) + BLANK + en.slice(idx + blank.length);
}

/**
 * 答案归一化：只认字母数字，其余一律当分隔符。
 * 大小写、标点、多余空格都不影响判定 —— "Don't" ≡ "dont"，"two apples" ≡ "Two Apples"。
 * 跟 300 句整句比对同一套思路。
 */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** 判断用户填的答案对不对 */
export function isAnswerCorrect(typed: string, answer: string): boolean {
  return normalizeAnswer(typed) === normalizeAnswer(answer);
}

/** 一句台词最终用的挖空词：手动指定优先，否则自动挑 */
export function resolveBlank(en: string, manual?: string): string {
  if (manual && en.toLowerCase().includes(manual.toLowerCase())) return manual;
  return pickBlank(en);
}
