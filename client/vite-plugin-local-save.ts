// client/vite-plugin-local-save.ts
//
// 仅在 `npm run dev` 下生效：把从 gequhai 抓到的 mp3 / lrc 写进本地课程目录，
// 并「外科手术式」更新该课程的 data.json。
//
// 为什么必须走 Vite 中间件：
//   - 浏览器不能静默写本地文件（File System Access API 也要用户逐个授权）
//   - 生产部署的是纯静态站点，没有 Node 进程
//   所以这个能力天生只服务于本地开发：写完的文件仍需在你自己的 img-library
//   仓库里 commit + push，前台才会从 CDN 拉到。
//
// apply: 'serve' 保证插件不进入构建产物，线上不存在该接口。

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ENDPOINT = '/__local/save-song';

/** 与 SongAdmin.tsx 的 slugifyForFilename 保持一致 —— 决定最终 ASCII 文件名 */
function slugifyForFilename(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 按文件头判断真实音频编码，返回应使用的扩展名。
 * 源站经常把 AAC/MP4 当「mp3」给 —— 之前就因此存出过 .mp3 后缀的 M4A 文件，
 * 文件名与编码不符。按内容定扩展名才能保证浏览器能正确解码播放。
 */
function sniffAudioExt(b: Buffer): '.mp3' | '.m4a' | '.aac' | null {
  if (b.subarray(0, 3).toString('latin1') === 'ID3') return '.mp3';
  if (b[0] === 0xff) {
    // MPEG 音频帧同步：11 位全 1；layer 位为 01 即 Layer III（mp3）
    if ((b[1] & 0xe0) === 0xe0 && ((b[1] >> 1) & 0x03) === 0x01) return '.mp3';
    // ADTS AAC：帧同步 FFF + ID=0 + layer=00
    if (b[1] === 0xf1 || b[1] === 0xf9) return '.aac';
  }
  if (b.subarray(4, 8).toString('latin1') === 'ftyp') return '.m4a';
  return null;
}

/**
 * 在 data.json 源码里定位指定分类的 items 数组，把一行 item 插到末尾。
 * 保留原文件所有其它字节（缩进、空行、紧凑写法都不动）——整文件 JSON.stringify
 * 重写会把仓库里手工维护的格式全改掉，产生巨大 diff。
 * 定位失败返回原串（调用方据此报错，绝不覆盖文件）。
 */
function insertItemLine(src: string, categoryName: string, itemLine: string): string {
  // 1) 定位分类（兼容 "name":"儿歌" 和 "name": "儿歌" 两种写法）
  const catMatch = new RegExp(`"name"\\s*:\\s*"${escapeRe(categoryName)}"`).exec(src);
  if (!catMatch) return src;

  // 2) 从分类位置向后找 "items": [
  const itemsIdx = src.indexOf('"items"', catMatch.index);
  if (itemsIdx < 0) return src;
  const openIdx = src.indexOf('[', itemsIdx);
  if (openIdx < 0) return src;

  // 3) 括号配对找 items 的收尾 ]（跳过字符串字面量里的括号）
  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx < 0) return src;

  // 4) 拆出末尾空白（] 之前的换行+缩进）以便原样保留
  const inner = src.slice(openIdx + 1, closeIdx);
  const trimmed = inner.replace(/\s+$/, '');
  const trailingWs = inner.slice(trimmed.length);
  const lastChar = trimmed.trimEnd().slice(-1);
  const needComma = lastChar !== '[' && lastChar !== ',' && lastChar !== '';

  // 5) 沿用最后一行的缩进
  const indentMatches = [...trimmed.matchAll(/\n([ \t]*)\S/g)];
  const indent = indentMatches.length ? indentMatches[indentMatches.length - 1][1] : '                ';

  // 6) 沿用文件原有的换行符 —— 仓库里的 data.json 是 CRLF，写死 \n 会留下混合行尾，
  //    让 git 报 "LF will be replaced by CRLF" 并污染 diff
  const eol = src.includes('\r\n') ? '\r\n' : '\n';

  const newInner = trimmed + (needComma ? ',' : '') + eol + indent + itemLine + trailingWs;
  return src.slice(0, openIdx + 1) + newInner + src.slice(closeIdx);
}

interface SaveBody {
  courseId?: string;
  category?: string;
  name?: string;
  en?: string;
  audioUrl?: string;
  lrc?: string;
}

async function readJsonBody(req: IncomingMessage): Promise<SaveBody> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SaveBody;
  } catch {
    throw new Error('invalid JSON body');
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function localSavePlugin(): Plugin {
  let dataRoot = '';

  return {
    name: 'local-save-song',
    // 只在 dev server 生效，不进构建产物
    apply: 'serve',

    configResolved(config) {
      dataRoot = resolve(config.root, 'public', 'data');
    },

    configureServer(server) {
      server.middlewares.use(ENDPOINT, (req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'POST only' });
            return;
          }

          try {
            const body = await readJsonBody(req);

            const courseId = (body.courseId ?? '').trim();
            const category = (body.category ?? '').trim();
            const name = (body.name ?? '').trim();
            const en = (body.en ?? '').trim();
            const audioUrl = (body.audioUrl ?? '').trim();
            const lrc = body.lrc ?? '';

            // ── 校验（防路径穿越 / 写坏文件名）──
            if (!/^[A-Za-z0-9_-]+$/.test(courseId)) {
              sendJson(res, 400, { ok: false, error: 'invalid courseId' });
              return;
            }
            if (!category || !name || !en) {
              sendJson(res, 400, { ok: false, error: 'category/name/en required' });
              return;
            }

            const slug = slugifyForFilename(en);
            // jsDelivr 对非 ASCII 文件名会 404，且要挡掉路径分隔符
            if (!slug || !/^[\x20-\x7e]+$/.test(slug) || /[\\/:*?"<>|]/.test(slug)) {
              sendJson(res, 400, { ok: false, error: 'slug must be ASCII and path-safe' });
              return;
            }

            const courseDir = resolve(dataRoot, courseId);
            // 防路径穿越：用相对路径判断，跨平台（Windows 用 \ 作分隔符）
            const rel = relative(resolve(dataRoot), courseDir);
            if (rel.startsWith('..') || isAbsolute(rel)) {
              sendJson(res, 400, { ok: false, error: 'path escape' });
              return;
            }

            const dataPath = join(courseDir, 'data.json');
            const audioDir = join(courseDir, 'audio');
            const lyricDir = join(courseDir, 'lyric');
            await mkdir(audioDir, { recursive: true });
            await mkdir(lyricDir, { recursive: true });

            const lyricRel = `/lyric/${slug}.lrc`;

            // ── 1) 下载音频并嗅探真实编码 ──
            // 注意：酷我 CDN 会拒绝 gequhai.com 的 Referer（实测带 Referer 403，不带 200），
            // 所以这里只带 UA，绝不带 Referer
            let audioBytes = 0;
            let audioRel = '';
            if (audioUrl) {
              const r = await fetch(audioUrl, { headers: { 'User-Agent': UA } });
              if (!r.ok) {
                sendJson(res, 502, { ok: false, error: `audio download HTTP ${r.status}` });
                return;
              }
              const buf = Buffer.from(await r.arrayBuffer());
              // < 20KB 基本是错误页而不是音频
              if (buf.length <= 20_000) {
                sendJson(res, 502, { ok: false, error: `audio too small (${buf.length}B)` });
                return;
              }
              const ext = sniffAudioExt(buf);
              if (!ext) {
                sendJson(res, 415, {
                  ok: false,
                  error: `unrecognized audio format (head=${buf.subarray(0, 8).toString('hex')})`,
                });
                return;
              }
              await writeFile(join(audioDir, `${slug}${ext}`), buf);
              audioRel = `/audio/${slug}${ext}`;
              audioBytes = buf.length;
            } else {
              sendJson(res, 400, { ok: false, error: 'no audio source for this song' });
              return;
            }

            // ── 2) 写歌词 ──
            let wroteLrc = false;
            if (lrc.trim()) {
              await writeFile(join(lyricDir, `${slug}.lrc`), lrc, 'utf8');
              wroteLrc = true;
            }

            // ── 3) 更新 data.json（手术式插入，不动其它字节）──
            let src: string;
            try {
              src = await readFile(dataPath, 'utf8');
            } catch {
              sendJson(res, 404, { ok: false, error: 'data.json not found', audioBytes, wroteLrc });
              return;
            }

            let catalog: { categories?: { name?: string; items?: { name?: string; en?: string }[] }[] };
            try {
              catalog = JSON.parse(src);
            } catch {
              sendJson(res, 500, { ok: false, error: 'data.json is not valid JSON' });
              return;
            }

            // 去重：同名（en 或 name）已存在就不重复插入
            const alreadyInCatalog = (catalog.categories ?? []).some((c) =>
              (c.items ?? []).some((it) => it?.en === en || (it?.name && it.name === name)),
            );

            let inserted = false;
            if (!alreadyInCatalog) {
              const line =
                `{"name": ${JSON.stringify(name)}, ` +
                `"en": ${JSON.stringify(en)}, ` +
                `"audio": ${JSON.stringify(audioRel)}, ` +
                `"lyric": ${JSON.stringify(lyricRel)}}`;
              const next = insertItemLine(src, category, line);
              if (next === src) {
                sendJson(res, 400, {
                  ok: false,
                  error: `category "${category}" not found in data.json`,
                  audioBytes,
                  wroteLrc,
                });
                return;
              }
              await writeFile(dataPath, next, 'utf8');
              inserted = true;
            }

            sendJson(res, 200, {
              ok: true,
              slug,
              audio: audioRel,
              lyric: lyricRel,
              audioBytes,
              wroteLrc,
              inserted,
              alreadyInCatalog,
            });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: (e as Error).message || 'unknown error' });
          }
        })();
      });
    },
  };
}
