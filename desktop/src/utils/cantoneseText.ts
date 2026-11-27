// 粤语 TTS 前的文本转换：简体 → 香港繁体。
//
// zh-HK 语音引擎（浏览器 TTS 与微软 zh-HK 音色都一样）按香港繁体词典读音，
// 直接喂简体文本会大量读错字（如「进来」「运动」等简体字形不在读音映射里）。
// 所以凡是以 zh-HK 送 TTS 的文本，先经过这里转成香港繁体再合成。
// 主进程生成 mp3 的链路（voiceIpc.ts）有同样的转换，两边保持一致。

import OpenCC from 'opencc-js';

let converter: ((s: string) => string) | null = null;

/** 简体 → 香港繁体；非中文或转换器不可用时原样返回 */
export function toHkText(text: string): string {
  if (!text) return text;
  if (!converter) converter = OpenCC.Converter({ from: 'cn', to: 'hk' });
  return converter(text);
}
