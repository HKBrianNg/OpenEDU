import type { CharStrokes, ScriptMode } from '../types';

/**
 * 笔画数据按年级拆成 6 个文件，简体繁体各一套，用 import.meta.glob 按需加载。
 *
 * 为什么不全塞一个文件：全部年级加起来有几 MB，一次性引入会把首屏拖死。
 * 而现在打开默认只拉当前年级、当前字形那几百 KB，切年级或切简繁时才补。
 *
 * 加载过的内容留在内存里，来回切不用重复下载。
 */

// TS 6 在这个项目配置下解析 import.meta.glob 的泛型写法会报错，改成先取再断言类型
type Loaders = Record<string, () => Promise<{ default: Record<string, CharStrokes> }>>;

const modules: Record<ScriptMode, Loaders> = {
  simplified: import.meta.glob('../data/strokes/simplified/grade*.js') as Loaders,
  traditional: import.meta.glob('../data/strokes/traditional/grade*.js') as Loaders,
};

const cache: Record<ScriptMode, Map<string, CharStrokes>> = {
  simplified: new Map(),
  traditional: new Map(),
};

const gradePromises: Record<ScriptMode, Map<number, Promise<void>>> = {
  simplified: new Map(),
  traditional: new Map(),
};

export function hasStrokeData(char: string, script: ScriptMode): boolean {
  return cache[script].has(char);
}

export function getStrokeData(char: string, script: ScriptMode): CharStrokes | undefined {
  return cache[script].get(char);
}

/** 把某一年级、某套字形的笔画数据装进来。同一份只装一次 */
export function loadGrade(grade: number, script: ScriptMode): Promise<void> {
  const pending = gradePromises[script].get(grade);
  if (pending) return pending;

  const key = `../data/strokes/${script}/grade${grade}.js`;
  const loader = modules[script][key];
  if (!loader) {
    return Promise.reject(
      new Error(`没有 ${grade} 年级${script === 'traditional' ? '繁体' : '简体'}笔画数据，先跑一次生成脚本`),
    );
  }

  const task = loader().then((mod) => {
    for (const [char, data] of Object.entries(mod.default)) {
      cache[script].set(char, data);
    }
  });
  gradePromises[script].set(grade, task);
  return task;
}

/** 确保某个字的数据已经在手边；拿不到就抛错 */
export async function ensureStrokeData(
  char: string,
  grade: number,
  script: ScriptMode,
): Promise<CharStrokes> {
  const hit = cache[script].get(char);
  if (hit) return hit;
  await loadGrade(grade, script);
  const data = cache[script].get(char);
  if (!data) throw new Error(`字表里查不到「${char}」的笔画数据`);
  return data;
}
