// client/vite-plugin-local-save.ts
//
// 仅在 `npm run dev` 下生效：把「待生成图片清单」写进本地课程目录
// （public/data/<course>/_tasks/）。
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
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

/**
 * 知识库配图：把「待生成清单」写进课程目录（public/data/<course>/_tasks/）。
 *
 * 为什么不在这里直接调生图接口：生图走的是云端多模态服务，要扣账号积分、
 * 需要 IDE 会话里的凭证，浏览器和 dev server 都拿不到。所以这个端点只负责
 * 落清单文件，真正的生图由 CodeBuddy 读这个文件后执行。
 */
const KB_TASKS_ENDPOINT = '/__local/save-kb-tasks';

interface TaskBody {
  courseId?: string;
  creditsPerImage?: number;
  items?: unknown;
}

async function readJsonBody(req: IncomingMessage): Promise<TaskBody> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as TaskBody;
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
    name: 'local-save',
    // 只在 dev server 生效，不进构建产物
    apply: 'serve',

    configResolved(config) {
      dataRoot = resolve(config.root, 'public', 'data');
    },

    configureServer(server) {
      // 知识库配图：落待生成清单
      server.middlewares.use(KB_TASKS_ENDPOINT, (req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'POST only' });
            return;
          }

          try {
            const body = (await readJsonBody(req)) as {
              courseId?: string;
              creditsPerImage?: number;
              items?: unknown;
            };

            const courseId = (body.courseId ?? '').trim();
            if (!/^[A-Za-z0-9_-]+$/.test(courseId)) {
              sendJson(res, 400, { ok: false, error: 'invalid courseId' });
              return;
            }
            if (!Array.isArray(body.items) || body.items.length === 0) {
              sendJson(res, 400, { ok: false, error: 'items must be a non-empty array' });
              return;
            }

            const courseDir = resolve(dataRoot, courseId);
            // 防路径穿越
            const kbRel = relative(resolve(dataRoot), courseDir);
            if (kbRel.startsWith('..') || isAbsolute(kbRel)) {
              sendJson(res, 400, { ok: false, error: 'path escape' });
              return;
            }

            const tasksDir = join(courseDir, '_tasks');
            await mkdir(tasksDir, { recursive: true });

            const file = join(tasksDir, 'pending-images.json');
            const payload = {
              courseId,
              creditsPerImage: body.creditsPerImage ?? 20,
              generatedAt: new Date().toISOString(),
              items: body.items,
            };
            await writeFile(file, JSON.stringify(payload, null, 2), 'utf8');

            sendJson(res, 200, {
              ok: true,
              count: body.items.length,
              path: `${courseId}/_tasks/pending-images.json`,
              absPath: file,
            });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: (e as Error).message || 'unknown error' });
          }
        })();
      });
    },
  };
}
