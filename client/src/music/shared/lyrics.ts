// LRC 歌词解析（中/英文歌曲共用）
//
// 行格式：
//   [mm:ss.ms]英文歌词            → text
//   [mm:ss.ms:zh]中文翻译         → textZh（与上一行英文按时间戳合并）
//
// 中文歌单没有 :zh 标记，所有行进 text；英文歌单则 text/textZh 同行显示

export interface LyricLine {
  time: number; // 秒
  text: string; // 主文案（中文歌 = 歌词原文；英文歌 = 英文行）
  textZh?: string; // 可选中文翻译（仅双语歌词文件）
}

const LINE_REGEX = /^\[(\d{2}):(\d{2})\.(\d{2,3})(?::zh)?\]\s*(.*)$/;

export function parseLRC(lrcText: string): LyricLine[] {
  const map = new Map<number, LyricLine>();

  for (const line of lrcText.split('\n')) {
    const match = line.match(LINE_REGEX);
    if (!match) continue;

    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, '0'), 10);
    const time = Number((min * 60 + sec + ms / 1000).toFixed(3));

    const text = match[4].trim();
    if (!text) continue;

    const entry: LyricLine = map.get(time) ?? { time, text: '' };
    if (line.includes(':zh]')) {
      entry.textZh = text;
    } else {
      entry.text = text;
    }
    map.set(time, entry);
  }

  return Array.from(map.values())
    .filter((e) => e.text || e.textZh)
    .sort((a, b) => a.time - b.time);
}
