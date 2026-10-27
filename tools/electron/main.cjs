// 主进程：拥有完整的 Node 能力（fs / child_process），渲染进程没有。
//
// 现在提供三件事：
//   1. 选数据根目录（默认是仓库里 client/public/data，也可以指到 img-library 的 clone）
//   2. 读知识库全量条目（直接读本地 JSON，不经过 CDN）
//   3. 把勾选题目写成 _tasks/pending-images.json —— Web 端在生产环境做不到的正是这一步
//
// 安全底线：渲染进程只能传「意图」，不能传任意路径。
// 所有路径在这里拼，并且用 safeJoin 挡掉 ../ 穿越。

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const DEV = process.env.TOOLS_DEV === '1';
const RENDERER_URL = 'http://localhost:5174';
const distIndex = path.join(__dirname, '..', 'dist', 'index.html');

// 业务逻辑单独成文件（纯 Node，可用 node 直接测），这里只负责接到 IPC
const { loadKnowledgeBase, saveTasks, saveImage, deleteImage } = require('./kb.cjs');
const {
  buildPrompt,
  generateImage,
  searchCommonsImage,
  downloadImage,
} = require('./images.cjs');
const {
  loadCatalog,
  fetchTranscript,
  importTranscript,
  searchOnline,
  importOnline,
} = require('./video.cjs');
const { loadSongs, addSong, removeSong, saveRemoteSong } = require('./songs.cjs');
const {
  searchSongs,
  getSongDetail,
  downloadAudio,
  sniffAudioExt,
} = require('./gequhai.cjs');
const { purge, probe } = require('./cdn.cjs');
// 后台管理：网页端那两个面板（管理控制台 / 用户管理）搬到了桌面端，
// 请求从这里发，绕开 file:// 页面的同源限制
const { login, request: apiRequest } = require('./api.cjs');

// ── 设置 ───────────────────────────────────────────────────────────
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

// tools/electron → ../.. 就是仓库根，默认指向仓库里已有的数据副本
const defaultDataRoot = () => path.resolve(__dirname, '..', '..', 'client', 'public', 'data');

function getSettings() {
  const fallback = { dataRoot: defaultDataRoot() };
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    return fallback;
  }
}

function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

// ── 路径安全 ───────────────────────────────────────────────────────
function safeJoin(base, rel) {
  const abs = path.resolve(base, rel);
  const relOut = path.relative(base, abs);
  // 跑到 base 外面去了（../ 或绝对路径）→ 拒绝
  if (relOut.startsWith('..') || path.isAbsolute(relOut)) {
    throw new Error(`路径越界：${rel}`);
  }
  return abs;
}

// ── IPC ────────────────────────────────────────────────────────────
ipcMain.handle('env', () => ({
  electron: process.versions.electron,
  node: process.versions.node,
  chrome: process.versions.chrome,
  dev: DEV,
}));

ipcMain.handle('settings:get', () => getSettings());

ipcMain.handle('settings:set', guard('settings:set', (patch) => setSettings(patch)));

// ── 后台管理 ───────────────────────────────────────────────────────
// token 只存在这里（settings.json），渲染进程拿不到明文，每次请求由这里带上
ipcMain.handle('api:login', guard('api:login', async ({ email, password } = {}) => {
  const { apiBase } = getSettings();
  const { token, user } = await login({ apiBase, email, password });
  // 昵称也存一份：界面上显示名字比显示邮箱亲切，邮箱留给下拉里做副标题
  const settings = setSettings({
    adminToken: token,
    adminEmail: email,
    adminName: user?.nickname ?? null,
  });
  return { user, settings: { ...settings, adminToken: true } };
}));

ipcMain.handle('api:request', guard('api:request', async ({ method, path, body } = {}) => {
  const { apiBase, adminToken } = getSettings();
  return apiRequest({ apiBase, token: adminToken, method, path, body });
}));

ipcMain.handle('api:logout', guard('api:logout', () => {
  const settings = setSettings({ adminToken: null, adminEmail: null, adminName: null });
  return { ...settings, adminToken: null };
}));

// Electron 里 window.open 会被拦，外链统一走 shell 开系统浏览器
ipcMain.handle('shell:open-external', guard('shell:open-external', async (url) => {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    throw new Error(`不允许打开的地址：${String(url)}`);
  }
  await shell.openExternal(url);
}));

ipcMain.handle('dialog:pick-directory', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled || !res.filePaths?.length) return null;
  return setSettings({ dataRoot: res.filePaths[0] });
});

/** 挑单个文件（音频 / 歌词），extensions 只做后缀过滤 */
ipcMain.handle('dialog:pick-file', async (_e, { kind } = {}) => {
  const filters =
    kind === 'lyric'
      ? [{ name: '歌词', extensions: ['lrc', 'txt'] }]
      : kind === 'subtitle'
        ? [{ name: '字幕', extensions: ['vtt', 'srt'] }]
        : [{ name: '音频', extensions: ['mp3', 'm4a', 'wav', 'ogg', 'flac'] }];
  const res = await dialog.showOpenDialog({ properties: ['openFile'], filters });
  if (res.canceled || !res.filePaths?.length) return null;
  return res.filePaths[0];
});

// 任何 handler 抛错都统一转成「带 message 的 rejection」，
// 免得渲染进程拿到 Electron 内部那一长串堆栈。
// 同时在终端打印完整堆栈 —— 界面上那行红字往往不够定位问题。
function guard(channel, fn) {
  // 第一个参数是 Electron 的 event，必须吃掉：
  // 直接 (...args) => fn(...args) 会把 event 当成业务参数传进去，
  // 结果 saveTasks 收到的 items 是 event 对象（不是数组）。
  return async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      console.error(`[${channel}] 失败：`, err);
      return { ok: false, error: err?.message ?? String(err) };
    }
  };
}

ipcMain.handle('kb:load', guard('kb:load', async () => {
  const root = getSettings().dataRoot;
  return { root, ...loadKnowledgeBase(root) };
}));

ipcMain.handle('kb:save-tasks', guard('kb:save-tasks', (items) => {
  const root = getSettings().dataRoot;
  console.log('[kb:save-tasks] 数据根目录:', root, '条数:', items?.length);
  return saveTasks(root, items);
}));

// ── 知识库配图：真的生成图片 ────────────────────────────────────────
// 图源是公开服务（Pollinations 文生图 / Wikimedia Commons 真实照片），
// 都不需要 API key —— 桌面端主进程直连，没有浏览器那套凭证问题。
// 一张图要十几秒，所以逐张把进度推给界面，不然窗口看着像卡死。
ipcMain.handle('kb:generate', guard('kb:generate', async ({ items, source } = {}) => {
  const root = getSettings().dataRoot;
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw new Error('没有勾选任何条目');

  const results = [];
  for (let n = 0; n < list.length; n++) {
    const it = list[n];
    const label = it?.title || it?.titleEn || `第 ${n + 1} 条`;
    emit('kb:progress', { n: n + 1, total: list.length, title: label, stage: 'start' });
    try {
      // 中文题目的英文译名更贴近图源语料，搜不到再退回中文
      const keyword = it?.titleEn || it?.title;
      const got =
        source === 'photo'
          ? await (async () => {
              const found = await searchCommonsImage(keyword);
              return found.ok ? await downloadImage(found.url) : found;
            })()
          : await generateImage(buildPrompt(it));
      if (!got.ok) throw new Error(got.error);

      const saved = saveImage(
        root,
        { contentLink: it?.contentLink, index: it?.index, file: `${it?.title}.${got.ext.slice(1)}` },
        got.buffer
      );
      console.log('[kb:generate]', label, '->', saved.file, saved.bytes, '字节');
      emit('kb:progress', { n: n + 1, total: list.length, title: label, stage: 'done', ok: true, file: saved.file });
      results.push({ key: it?.key, ok: true, ...saved });
    } catch (err) {
      emit('kb:progress', { n: n + 1, total: list.length, title: label, stage: 'done', ok: false, error: err.message });
      results.push({ key: it?.key, ok: false, error: err.message });
    }
  }

  return { results, ok: results.every((r) => r.ok) };
}));

// ── 知识库配图：删除 ───────────────────────────────────────────────
// 想换图就用它先把旧的删掉（删 content/ 里的 jpg + 清 imageUrl），再重新生成。
// 纯本地删除，跑得快，所以不像生图那样需要推进度。
ipcMain.handle('kb:delete-images', guard('kb:delete-images', (items) => {
  const root = getSettings().dataRoot;
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw new Error('没有勾选任何条目');

  const results = list.map((it) => {
    try {
      const r = deleteImage(root, { contentLink: it?.contentLink, index: it?.index });
      console.log('[kb:delete-images]', r.title || `${it?.index}`, '->', r.file ?? '(本来就没图)');
      return { key: it?.key, ...r };
    } catch (err) {
      return { key: it?.key, ok: false, error: err.message };
    }
  });

  return { results, ok: results.every((r) => r.ok) };
}));

// ── 视频字幕 ───────────────────────────────────────────────────────
ipcMain.handle('video:load', guard('video:load', () => loadCatalog(getSettings().dataRoot)));

// 抓字幕要跑几十秒，不能同步等：一边跑一边把 yt-dlp 的输出推给界面，
// 否则窗口会像卡死一样。逐条串行处理，失败的继续下一条。
ipcMain.handle('video:fetch', guard('video:fetch', async (items) => {
  const root = getSettings().dataRoot;
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw new Error('没有勾选任何视频');

  const results = [];
  for (const it of list) {
    emit('yt:log', { type: 'start', id: it.id, title: it.titleEn || it.titleZh });
    try {
      const r = await fetchTranscript(root, it, (line) =>
        emit('yt:log', { type: 'log', id: it.id, line })
      );
      emit('yt:log', { type: 'done', id: it.id, ok: true, text: `${r.lines} 句 → ${r.file}` });
      results.push({ id: it.id, ok: true, ...r });
    } catch (err) {
      emit('yt:log', { type: 'done', id: it.id, ok: false, text: err.message });
      results.push({ id: it.id, ok: false, error: err.message });
    }
  }
  return { results };
}));

// yt-dlp 抓不到时的兜底：导入自己下好的 vtt/srt
ipcMain.handle('video:import', guard('video:import', (payload) =>
  importTranscript(getSettings().dataRoot, payload?.item, payload?.srcPath)
));

// ── 从网上导入视频 ─────────────────────────────────────────────────
// 学歌曲那套（搜 → 选 → 存）：在网上搜视频，选一条直接进目录，
// 愿意的话顺手把字幕抓下来。日志复用 yt:log，界面上不用再加一块日志区。
ipcMain.handle('video:search', guard('video:search', (payload) =>
  searchOnline(payload?.keyword, { limit: payload?.limit })
));

ipcMain.handle('video:import-online', guard('video:import-online', async (payload) => {
  const root = getSettings().dataRoot;
  const input = payload ?? {};
  const title = input.titleEn || input.titleZh || input.videoId;
  emit('yt:log', { type: 'start', id: '-', title: `导入：${title}` });
  return await importOnline(root, input, (line) => emit('yt:log', { type: 'log', id: '-', line }));
}));

// ── 歌曲 ───────────────────────────────────────────────────────────
ipcMain.handle('songs:load', guard('songs:load', (courseId) =>
  loadSongs(getSettings().dataRoot, courseId)
));

ipcMain.handle('songs:add', guard('songs:add', (payload) =>
  addSong(getSettings().dataRoot, payload?.courseId, payload)
));

ipcMain.handle('songs:remove', guard('songs:remove', (payload) =>
  removeSong(getSettings().dataRoot, payload?.courseId, payload?.key)
));

// ── 从 gequhai.com 导入 ────────────────────────────────────────────
// 网上那套要绕 Worker（浏览器有 CORS），桌面端主进程直连就行。
ipcMain.handle('songs:search', guard('songs:search', (singer) => searchSongs(singer)));

ipcMain.handle('songs:detail', guard('songs:detail', (id) => getSongDetail(id)));

// ── CDN 缓存 ───────────────────────────────────────────────────────
// 推完 GitHub 前台不会立刻变（jsDelivr 缓存 12 小时），得主动清一次。
ipcMain.handle('cdn:purge', guard('cdn:purge', async (paths) => {
  const list = Array.isArray(paths) ? paths : [paths];
  const results = [];
  for (const p of list) {
    const r = await purge(p);
    console.log('[cdn:purge]', p, r.ok ? 'ok' : `失败 ${r.error}`);
    results.push(r);
  }
  return { results, ok: results.every((r) => r.ok) };
}));

ipcMain.handle('cdn:probe', guard('cdn:probe', async (rel) => {
  const r = await probe(rel);
  // data 太大，没必要整个塞回界面，只回计数
  return { ...r, data: undefined };
}));

ipcMain.handle('songs:import', guard('songs:import', async (p) => {
  const root = getSettings().dataRoot;
  const buf = await downloadAudio(p?.audioUrl);
  const ext = sniffAudioExt(buf);
  if (!ext) throw new Error('下载下来的不是认识的音频格式');
  console.log('[songs:import]', p?.name, buf.length, '字节', ext);
  return saveRemoteSong(root, p?.courseId, {
    category: p?.category,
    name: p?.name,
    en: p?.en,
    audioBuffer: buf,
    audioExt: ext,
    lrc: p?.lrc,
  });
}));

// ── 窗口 ───────────────────────────────────────────────────────────
/** 主窗口引用：长任务（yt-dlp）要靠它把进度推给界面 */
let mainWindow = null;

/** 主动推消息给渲染进程（渲染进程没法轮询，只能等事件） */
function emit(channel, payload) {
  try {
    mainWindow?.webContents?.send(channel, payload);
  } catch {
    /* 窗口关了就算了 */
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    title: 'OpenEDU Tools',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, // 渲染进程与主进程隔离，只能走 preload
      nodeIntegration: false, // 渲染进程拿不到 Node
    },
  });

  mainWindow = win;
  win.on('closed', () => {
    mainWindow = null;
  });

  if (DEV) {
    win.loadURL(RENDERER_URL);
    return;
  }

  if (!fs.existsSync(distIndex)) {
    dialog.showErrorBox(
      '还没构建渲染进程',
      '先跑：npm run build:renderer\n（或者直接用 npm run dev）'
    );
    app.quit();
    return;
  }
  win.loadFile(distIndex);
}

app.whenReady().then(createWindow);

// ── 冒烟测试 ───────────────────────────────────────────────────────
// TOOLS_SMOKE=1 时，窗口起来后直接在渲染进程里调一次 kbSaveTasks，
// 把结果打印到终端。用来确认「IPC 这一整条链路」通不通 ——
// 只用 node 调 kb.cjs 测不到 IPC 层的问题。
//   npm run smoke
if (process.argv.includes('--smoke')) {
  app.whenReady().then(() => {
    setTimeout(async () => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) {
        console.log('[smoke] 没有窗口');
        app.quit();
        return;
      }
      // 配图：真的生成一张（256px，小图快）+ 真的搜一张 Commons 照片，
      // 再用真字节走一遍「落盘 + 回写」（写进 _scratch 沙盒，跑完删掉）。
      //
      // 这段必须待在 Node 侧：上面那段 executeJavaScript 跑在浏览器里，
      // 那边没有 require / fs，而且 ${} 会被当成模板插值把字符串撑坏。
      const imgAi = await generateImage(
        buildPrompt({ title: '变色龙为什么会变色', titleEn: 'Why Do Chameleons Change Colour?' }),
        { width: 256, height: 256 }
      );
      const imgPhoto = await (async () => {
        const found = await searchCommonsImage('chameleon');
        return found.ok ? await downloadImage(found.url) : found;
      })();
      let imgSaved = null;
      if (imgAi.ok) {
        const smokeRoot = path.join(__dirname, '..', '_scratch', 'kb-smoke');
        const sb = path.join(smokeRoot, 'KnowledgeBase', 'content');
        try {
          fs.mkdirSync(sb, { recursive: true });
          fs.writeFileSync(
            path.join(sb, 'unit.json'),
            JSON.stringify([{ title: { zh: '烟测题', en: 'Smoke' }, content: { zh: 'x', en: 'y' } }]),
            'utf8'
          );
          const r = saveImage(
            smokeRoot,
            { contentLink: 'unit.json', index: 0, file: '烟测题' + imgAi.ext },
            imgAi.buffer
          );
          imgSaved = {
            file: r.file,
            bytes: r.bytes,
            exists: fs.existsSync(path.join(sb, r.file)),
            urlWritten: JSON.parse(fs.readFileSync(path.join(sb, 'unit.json'), 'utf8'))[0].imageUrl,
          };
        } finally {
          fs.rmSync(path.join(__dirname, '..', '_scratch'), { recursive: true, force: true });
        }
      }

      try {
        const res = await win.webContents.executeJavaScript(`(async () => {
          const probe = {
            hasApi: typeof window.api,
            keys: window.api ? Object.keys(window.api) : [],
            type: typeof (window.api || {}).kbSaveTasks,
          };
          const payload = [
            { chapter: '数学', contentLink: 'math.json', index: 0, title: '烟测条目', titleEn: 'Smoke Item' },
          ];
          const out = await window.api.kbSaveTasks(payload);
          const video = await window.api.videoLoad();
          const songs = await window.api.songsLoad('ChineseSongs');
          const songsEn = await window.api.songsLoad('EnglishSongs');
          // 非法课程 id 必须报错。界面上写错 options（value 丢了）会传进来 undefined，
          // 静默返回数据的话就会「看着像切了课其实没切」，所以这里要求它响亮地失败。
          const songsBad = await window.api.songsLoad(undefined);
          // gequhai：只测「搜 → 详情」这两步（联网 + IPC）。
          // 落盘那步不在这里真跑 —— 会在你的仓库里留下 mp3/lrc 垃圾文件，
          // 清理容易删错。落盘由 test-gequhai.cjs 用假字节在沙盒里覆盖。
          const gqSearch = await window.api.songsSearch('周杰伦');
          const gqId = gqSearch.data?.[0]?.id;
          const gqDetail = gqId ? await window.api.songsDetail(gqId) : { ok: false };
          // CDN：只读探一次，不真清缓存（清了会把线上缓存打掉）
          const cdn = await window.api.cdnProbe('openEDU/ChineseSongs/data.json');
          const first = (s) => s.data?.rows?.[0]?.name ?? null;
          return {
            probe,
            sentLen: payload.length,
            out,
            video: { ok: video.ok, count: video.data?.rows?.length, error: video.error },
            songs: {
              zh: { ok: songs.ok, count: songs.data?.rows?.length, first: first(songs), error: songs.error },
              en: { ok: songsEn.ok, count: songsEn.data?.rows?.length, first: first(songsEn), error: songsEn.error },
              bad: { ok: songsBad.ok, error: songsBad.error },
            },
            // cdn 是信封，内容在 cdn.data 里
            cdn: {
              ok: cdn.ok,
              status: cdn.data?.status,
              count: cdn.data?.count,
              age: cdn.data?.age,
              error: cdn.error ?? cdn.data?.error,
            },
            gequhai: {
              search: { ok: gqSearch.ok, count: gqSearch.data?.length ?? 0, error: gqSearch.error },
              detail: {
                ok: gqDetail.ok,
                title: gqDetail.data?.title ?? null,
                audioCode: gqDetail.data?.audioCode ?? null,
                hasUrl: Boolean(gqDetail.data?.audioUrl),
                hasLrc: Boolean(gqDetail.data?.lrc),
                error: gqDetail.error,
              },
            },
          };
        })()`);
        res.images = {
          ai: { ok: imgAi.ok, ext: imgAi.ext ?? null, bytes: imgAi.buffer?.length ?? 0, error: imgAi.error },
          photo: {
            ok: imgPhoto.ok,
            ext: imgPhoto.ext ?? null,
            bytes: imgPhoto.buffer?.length ?? 0,
            error: imgPhoto.error,
          },
          saved: imgSaved,
        };
        console.log('[smoke] 结果:', JSON.stringify(res));
      } catch (err) {
        console.log('[smoke] 异常:', err?.message ?? String(err));
      }
      app.quit();
    }, 3000);
  });
}

// ── UI 冒烟测试 ────────────────────────────────────────────────────
// 上面那个 --smoke 只测「后端能不能返回正确数据」，测不到界面上点错选项。
// 这个模式在真实窗口里点一遍：切到歌曲 Tab → 打开课程下拉 → 选英文歌 → 读表格。
// 用来抓「option 少写 value 导致切换无效」这类只在界面上暴露的 bug。
//   npm run smoke:ui
if (process.argv.includes('--smoke-ui')) {
  app.whenReady().then(() => {
    setTimeout(async () => {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) {
        console.log('[smoke-ui] 没有窗口');
        app.quit();
        return;
      }
      const nodeSleep = (ms) => new Promise((r) => setTimeout(r, ms));
      try {
        // ── 首屏应该是主界面，登录页要用户点了才出现 ──
        const first = await win.webContents.executeJavaScript(
          `({ nav: [...document.querySelectorAll('.ant-menu-item')].map((e) => e.textContent.trim()), buttons: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()), hasEmailInput: !!document.querySelector('input[placeholder="邮箱"]') })`
        );
        console.log('[smoke-ui] 首屏: ' + JSON.stringify(first));

        // ── 语言 / 主题：偏好不是权限，不登录也要能动 ──
        const prefs = await win.webContents.executeJavaScript(
          `({ hasLangBtn: [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'EN'), hasThemeBtn: [...document.querySelectorAll('button')].some((b) => b.querySelector('.anticon-sun, .anticon-moon')) })`
        );
        console.log('[smoke-ui] 未登录时的偏好开关: ' + JSON.stringify(prefs));

        await win.webContents.executeJavaScript(
          `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'EN').click()`
        );
        await nodeSleep(900);
        const inEnglish = await win.webContents.executeJavaScript(
          `({ nav: [...document.querySelectorAll('.ant-menu-item')].map((e) => e.textContent.trim()) })`
        );
        console.log('[smoke-ui] 切成英文: ' + JSON.stringify(inEnglish));

        // 后面几步靠中文串认界面，先切回来
        await win.webContents.executeJavaScript(
          `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '中').click()`
        );
        await nodeSleep(900);

        // 点「登录」→ 换成登录页
        const clicked = await win.webContents.executeJavaScript(
          `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\\s/g, '').includes('登录')); if (b) { b.click(); return true; } return false; })()`
        );
        console.log('[smoke-ui] 点到登录按钮: ' + clicked);
        await nodeSleep(600);
        // 注意 antd 会给「两字中文」按钮自动插空格（登录 → 登 录），比对前先去掉空白
        const gate = await win.webContents.executeJavaScript(
          `({ hasEmailInput: !!document.querySelector('input[placeholder="邮箱"]'), hasBackBtn: [...document.querySelectorAll('button')].some((b) => b.textContent.replace(/\\s/g, '').includes('返回')), baseShown: document.body.innerText.includes('后台地址') })`
        );
        console.log('[smoke-ui] 点登录后: ' + JSON.stringify(gate));

        // ── 真登录链路（用本地假后台顶上，不碰真实账号） ──
        // 测的是「登录 → 记住登录态 → 显示名字」这条链，所以后台换成假服务
        // 不真的起端口：在主进程里临时顶替 fetch，api.cjs 用的就是这个
        const realFetch = globalThis.fetch;
        globalThis.fetch = async (...args) => {
          const url = String(args[0] ?? '');
          if (url.includes('/api/auth/login')) {
            return new Response(
              JSON.stringify({
                code: 'LOGIN_SUCCESS',
                message: 'ok',
                data: {
                  token: 'mock-token',
                  user: { id: '1', email: 'a@b.c', nickname: '测试用户', role: 'admin' },
                },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } }
            );
          }
          return realFetch(...args);
        };

        // 现在已经在登录页上：填表 → 提交
        const filled = await win.webContents.executeJavaScript(`(() => {
          const set = (el, v) => {
            const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            s.call(el, v);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const email = document.querySelector('input[placeholder="邮箱"]');
          const pwd = document.querySelector('input[type="password"]');
          if (!email || !pwd) return false;
          set(email, 'a@b.c');
          set(pwd, 'whatever');
          return true;
        })()`);
        console.log('[smoke-ui] 表单填好: ' + filled);
        await nodeSleep(300);
        await win.webContents.executeJavaScript(
          `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.replace(/\\s/g, '').includes('登录')); if (b) { b.click(); return true; } return false; })()`
        );
        await nodeSleep(2000);

        const snap = () =>
          win.webContents.executeJavaScript(
            `({ hasName: [...document.querySelectorAll('button')].some((b) => b.textContent.includes('测试用户')), hasLoginBtn: [...document.querySelectorAll('button')].some((b) => b.textContent.replace(/\\s/g, '').includes('登录')), emailInput: !!document.querySelector('input[placeholder="邮箱"]'), alert: document.querySelector('.ant-message-notice-content')?.textContent ?? null, text: document.body.innerText.slice(0, 70).replace(/\\n/g, ' / ') })`
          );
        console.log('[smoke-ui] 登录后: ' + JSON.stringify(await snap()));



        // 关掉页面再开，登录态得还在
        win.reload();
        await nodeSleep(2500);
        console.log('[smoke-ui] 重开后: ' + JSON.stringify(await snap()));

        // 收尾：还原 fetch
        globalThis.fetch = realFetch;

        // 播种一个假 token 进登录态：冒烟测的是界面，不是后台鉴权。
        // 跑完会清掉（见末尾），不会在你的 settings.json 里留下痕迹。
        await win.webContents.executeJavaScript(
          `window.api.settingsSet({ adminToken: 'smoke-token', adminEmail: 'smoke@test.com', adminName: '烟测用户' })`
        );
        win.reload();
        await nodeSleep(2500);

        const res = await win.webContents.executeJavaScript(`(async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const q = (s) => document.querySelector(s);
          const all = (s) => [...document.querySelectorAll(s)];
          const out = {};

          // ── 外壳：顶部菜单 + 右上角账号（登录后显示名字，不显示邮箱/数据根目录）──
          out.navItems = all('.ant-menu-item').map((e) => e.textContent.trim());
          out.hasAccountBtn = all('button').some((b) => b.textContent.includes('烟测用户'));
          out.dataRootShown = document.body.innerText.includes('数据根目录');

          // ── 知识库配图面板（默认就是这个菜单项）：只查控件在不在，不点生成 ──
          // 真点会往 content/ 里写图并改 imageUrl，冒烟不该动用户的仓库。
          out.genBtnFound = all('button').some((b) => b.textContent.includes('生成配图'));
          out.delBtnFound = all('button').some((b) => b.textContent.includes('删除配图'));
          out.sourceSelectFound = all('.ant-select').some((e) =>
            e.textContent.includes('AI 插画')
          );

          // 切到「歌曲」—— 顶部菜单，不是 Tab（Tabs 换成 Menu 了）
          const tab = all('.ant-menu-item').find((e) => e.textContent.includes('歌曲'));
          out.tabFound = Boolean(tab);
          if (tab) tab.click();
          await sleep(800);

          // 按文本定位，不依赖具体类名 —— antd v6 把 v5 的
          // .ant-select-selector / .ant-tabs-tabpane-active 都改了名字
          const titleEl = () => q('.ant-table-title');
          out.titleBefore = titleEl()?.textContent ?? null;

          // 歌曲面板的课程下拉：文本是「中文歌」的那个 Select
          const sel = all('.ant-select').find((e) => e.textContent.includes('中文歌'));
          out.selectFound = Boolean(sel);
          if (sel) {
            sel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            sel.click();
          }
          await sleep(900);

          // 下拉挂在 body 上的弹层里，不在面板内
          out.dropdownFound = Boolean(q('.ant-select-dropdown'));
          const opts = all('.ant-select-dropdown [class*="item"]');
          out.options = opts.map((o) => o.textContent);
          const en = opts.find((o) => o.textContent.includes('英文歌'));
          out.enOptionFound = Boolean(en);
          if (en) {
            en.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            en.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            en.click();
          }
          await sleep(1800);

          out.titleAfter = titleEl()?.textContent ?? null;
          // 行也要限定在带标题的那张表里（歌曲表才有 title），
          // 否则会把隐藏面板的行一起数进来
          const songsTable = titleEl()?.closest('.ant-table-wrapper') ?? document.body;
          const rows = songsTable.querySelectorAll('.ant-table-tbody tr.ant-table-row');
          out.rowCount = rows.length;
          out.firstRow = rows[0]?.textContent ?? null;

          // ── 清 CDN 缓存按钮 ──
          // 真的会清线上缓存，但只是让边缘节点重新回源，没有副作用
          out.cdnBefore = all('.ant-tag').map((t) => t.textContent);
          const cdnBtn = all('button').find((b) => b.textContent.includes('清 CDN 缓存'));
          out.cdnBtnFound = Boolean(cdnBtn);
          cdnBtn?.click();
          await sleep(8000); // 清一次 + 再探一次，给足时间
          out.cdnTag = all('.ant-tag')
            .map((t) => t.textContent)
            .find((t) => t.includes('线上')) ?? null;

          // ── 网上导入弹窗：只搜不存 ──
          // 存的话会往你的仓库里写 mp3，冒烟测试不该留垃圾，所以到搜索结果为止
          const importBtn = all('button').find((b) => b.textContent.includes('从网上导入'));
          out.importBtnFound = Boolean(importBtn);
          importBtn?.click();
          await sleep(700);

          const modal = all('.ant-modal').pop();
          out.importModalOpen = Boolean(modal);
          out.modalCount = all('.ant-modal').length;
          out.modalTitles = all('.ant-modal').map(
            (m) => m.querySelector('.ant-modal-title')?.textContent ?? '?'
          );
          out.modalButtons = modal
            ? [...modal.querySelectorAll('button')].map((b) => b.textContent).slice(0, 12)
            : [];
          // 歌手卡片随课程变（中文歌 tab 是中文歌手，英文歌 tab 是英文歌手），
          // 所以两边都列几个，匹配到哪个点哪个
          const NAMES = ['周杰伦', 'Adele', 'Taylor Swift', 'Bee Gees'];
          const singerBtn = modal
            ? [...modal.querySelectorAll('button')].find((b) =>
                NAMES.some((n) => b.textContent.includes(n))
              )
            : null;
          out.singerBtnFound = Boolean(singerBtn);
          singerBtn?.click();
          await sleep(4000); // 联网搜索，给足时间

          const rows2 = modal
            ? [...modal.querySelectorAll('.ant-table-tbody tr.ant-table-row')]
            : [];
          out.importResultCount = rows2.length;
          out.importFirstRow = rows2[0]?.textContent ?? null;
          return out;
        })()`);
        console.log('[smoke-ui]', JSON.stringify(res, null, 1));
        // 自带断言：切到英文歌后，标题必须变成英文歌，且首行不能还是中文那批
        const ok = String(res.titleAfter ?? '').includes('英文歌');
        console.log(ok ? '[smoke-ui] 通过：切换课程生效' : '[smoke-ui] 失败：点了英文歌但没切过去');
        console.log('[smoke-ui] 菜单项: ' + JSON.stringify(res.navItems ?? []));
        process.exitCode = ok ? 0 : 1;
      } catch (err) {
        console.log('[smoke-ui] 异常:', err?.message ?? String(err));
      }
      // 不管跑没跑完都要清掉播种的假 token：留着的话下次打开工具是「已登录」的假象，
      // 下一次冒烟的「首屏应该有登录按钮」也会跟着判错
      try {
        await win.webContents.executeJavaScript(`window.api.apiLogout()`);
        console.log('[smoke-ui] 假 token 已清理');
      } catch (e) {
        console.log('[smoke-ui] 清理假 token 失败:', e?.message ?? String(e));
      }
      app.quit();
    }, 3000);
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
