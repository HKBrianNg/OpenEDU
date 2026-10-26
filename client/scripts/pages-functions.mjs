/**
 * 把 functions/ 编成 Pages 认识的两件东西放进 dist：
 *
 *   dist/_worker.js      ← 编译出来的 Functions worker
 *   dist/_routes.json    ← 路由表，里面写着只有 /api/* 走 Functions
 *
 * 为什么不干脆 `wrangler pages deploy dist` 让它自己找 functions/：
 * deploy 会不会自动带上 Functions 要看 wrangler 版本的心情，装在不同机器上行为还可能不一样。
 * 编哪朝哪代是不可预期的部署产物（Functions 悄悄没生效、静态资源却照常部署）是最难查的故障 ——
 * 所以这里显式编译、显式落位，产物是什么一眼可见。
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tmp = path.join(root, 'dist', '_functions-tmp');
const out = path.join(root, 'dist');

// Windows 上 spawn 没法直接执行 npx.cmd，得经 cmd /c；
// 也不用 shell:true + args 那种写法（node 会抛 DEP0190 弃用告警）
const npx = (args) =>
  process.platform === 'win32'
    ? spawnSync('cmd', ['/c', 'npx', ...args], { cwd: root, stdio: 'inherit' })
    : spawnSync('npx', args, { cwd: root, stdio: 'inherit' });

const run = (args) => {
  console.log(`> npx ${args.join(' ')}`);
  const r = npx(args);
  if (r.status !== 0) {
    console.log(`\n✗ 命令失败（exit ${r.status}）`);
    process.exit(r.status ?? 1);
  }
};

fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

// 1) 编译
run([
  'wrangler',
  'pages',
  'functions',
  'build',
  'functions',
  '--outdir',
  tmp,
  '--output-routes-path',
  path.join(tmp, '_routes.json'),
]);

// 2) 落位：wrangler 编出来叫 index.js，Pages 认的是 _worker.js
const built = path.join(tmp, 'index.js');
const routes = path.join(tmp, '_routes.json');
for (const f of [built, routes]) {
  if (!fs.existsSync(f)) {
    console.log(`\n✗ 少了 ${f}，编译结果不对`);
    process.exit(1);
  }
}

fs.copyFileSync(built, path.join(out, '_worker.js'));
fs.copyFileSync(routes, path.join(out, '_routes.json'));
fs.rmSync(tmp, { recursive: true, force: true });

const routesJson = JSON.parse(fs.readFileSync(path.join(out, '_routes.json'), 'utf8'));
console.log('\n✓ dist 里已就绪：');
console.log(`  _worker.js     ${(fs.statSync(path.join(out, '_worker.js')).size / 1024).toFixed(1)} KB`);
console.log(`  _routes.json   include: ${JSON.stringify(routesJson.include)}`);
console.log('\n  （include 之外的请求仍然由 Pages 静态资源处理，站本身不受影响）');
