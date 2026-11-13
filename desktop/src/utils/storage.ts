// client/src/utils/storage.ts
// localStorage 集中管理：
//  - 所有 key 统一带 openedu: 前缀，并在此处注册（新增落盘需求必须先加 STORAGE_KEYS）
//  - 读写自带 try/catch 防护：localStorage 损坏/隐私模式/容量满都不抛错
//  - 应用启动时调 migrateLegacyStorage()，把旧散 key 一次性搬进新命名空间后删除

const PREFIX = 'openedu:';

export const STORAGE_KEYS = {
  token: `${PREFIX}token`,
  user: `${PREFIX}user`,
  englishwordProgress: `${PREFIX}englishword_progress`,
  calendarEvents: `${PREFIX}home_calendar_events`,
  // 知识库配图管理：勾选待生成配图的条目 key
  knowledgeBaseImageTasks: `${PREFIX}kb_image_tasks`,
  // 视频字幕管理：勾选待生成台词的视频 key
  videoTranscriptTasks: `${PREFIX}video_transcript_tasks`,
} as const;

// 历史遗留 key → 新 key 的映射（迁移用，新功能禁止再往这里加）
const LEGACY_KEY_MAP: Record<string, string> = {
  token: STORAGE_KEYS.token,
  user: STORAGE_KEYS.user,
  englishword_progress: STORAGE_KEYS.englishwordProgress,
  home_calendar_events: STORAGE_KEYS.calendarEvents,
};

export const storage = {
  // 读原始字符串（token 这类非 JSON 值用它）
  getRaw(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setRaw(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // 容量满 / 隐私模式，静默失败
    }
  },

  // 读 JSON 值；解析失败自动清掉坏 key 并返回 null
  get<T>(key: string): T | null {
    const raw = storage.getRaw(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      storage.remove(key);
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    storage.setRaw(key, JSON.stringify(value));
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// 一次性迁移：把旧散 key 的值搬到带前缀的新 key，然后删除旧 key。
// 在 main.tsx 渲染前调用（同步，幂等——新 key 已存在则以新 key 为准）。
export function migrateLegacyStorage(): void {
  try {
    for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
      const raw = localStorage.getItem(oldKey);
      if (raw === null) continue;
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, raw);
      }
      localStorage.removeItem(oldKey);
    }
  } catch {
    // localStorage 不可用时跳过迁移，各调用方已各自兜底
  }
}
