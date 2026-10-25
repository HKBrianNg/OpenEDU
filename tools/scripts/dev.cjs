// 一条命令把桌面端跑起来：vite dev server + Electron。
//
// 为什么需要它：Electron 要等 vite 把渲染进程 serve 起来才能 loadURL，
// 否则窗口是一片空白。这里轮询 5174 端口就绪后再拉起 Electron。
//
// 退出时两个进程一起收掉，不留后台孤儿。

const { spawn, execSync } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const root = path.join(__dirname, '..');
const PORT = 5174;
const isWin = process.platform === 'win32';

const children = [];

function killAll() {
  for (const c of children) {
    if (!c.pid || c.killed) continue;
    try {
      if (isWin) {
        // /t 连子进程一起杀（vite 会 fork 出 esbuild）
        execSync(`taskkill /pid ${c.pid} /t /f`, { stdio: 'ignore' });
      } else {
        process.kill(-c.pid, 'SIGTERM');
      }
    } catch {
      /* 已经没了就算了 */
    }
  }
}

process.on('SIGINT', () => {
  killAll();
  process.exit(0);
});
process.on('exit', killAll);

// 只看 vite 自己的输出有没有打到 "ready" / "Local:"。
// 不用 HTTP 探活：vite 默认可能只绑到 ::1，轮询 127.0.0.1 永远连不上。
function waitForVite(stream, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`vite 在 ${timeoutMs}ms 内没就绪`)), timeoutMs);
    stream.on('data', (buf) => {
      const text = buf.toString();
      if (/ready in|Local:/i.test(text)) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

async function main() {
  console.log('> 启动 vite dev server (5174)…');

  // 直接跑 vite 的入口文件，不走 npx：
  // Windows 下 spawn('npx.cmd') 会报 EINVAL（.cmd 不是可执行文件）
  const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const vite = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Unix 下独立进程组，方便整组杀掉
    detached: !isWin,
  });
  children.push(vite);

  // 透传输出（不然看不到 vite 的报错），同时拿来判断是否就绪
  vite.stdout.pipe(process.stdout);
  vite.stderr.pipe(process.stderr);

  await waitForVite(vite.stdout);
  console.log('> vite 就绪，拉起 Electron…');

  const electron = spawn(
    process.execPath,
    [path.join(root, 'node_modules', 'electron', 'cli.js'), '.'],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, TOOLS_DEV: '1' },
      detached: !isWin,
    }
  );
  children.push(electron);

  electron.on('exit', (code) => {
    killAll();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err.message);
  killAll();
  process.exit(1);
});
