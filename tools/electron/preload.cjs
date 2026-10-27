// preload：渲染进程与主进程之间唯一的桥。
//
// 安全底线：nodeIntegration: false + contextIsolation: true。
// 渲染进程拿不到 require / fs / child_process，只能调这里列出来的接口。
// 每加一个能力都在这里显式暴露一个方法，主进程侧负责校验路径。

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  /** 环境信息，用来确认桥接通了 */
  env: () => ipcRenderer.invoke('env'),

  /** 当前设置（数据根目录等） */
  settings: () => ipcRenderer.invoke('settings:get'),

  /** 弹系统目录选择框，选完存进设置；取消则返回 null */
  pickDirectory: () => ipcRenderer.invoke('dialog:pick-directory'),

  /** 弹系统文件选择框：kind='audio' | 'lyric'；取消返回 null */
  pickFile: (kind) => ipcRenderer.invoke('dialog:pick-file', { kind }),

  // ── EnglishWord 单词配图 ──
  /**
   * 读全量单词 + 每张图的原图/缩略图状态（本地 JSON，不走 CDN）。
   * 返回 { root, rows, problems, counts }
   */
  wordImagesLoad: () => ipcRenderer.invoke('wordimages:load'),
  /**
   * 给一个词配图：{ contentLink, index, srcPath }。
   * 文件复制进 content/ 并顺手生成缩略图；只有文件名跟英文名推不出来时才回写 url。
   */
  wordImagesImport: (payload) => ipcRenderer.invoke('wordimages:import', payload),
  /**
   * 生成缩略图。files 为空 = 所有「有原图但没缩略图」的。
   * 缩完比原图还大的会直接沿用原图（本来就是小图，压不动）。
   */
  wordImagesGenThumbs: (files) => ipcRenderer.invoke('wordimages:gen-thumbs', { files }),
  /** 删图：content/ 和 content/thumb/ 各删一份，写了 url 的顺手清掉 */
  wordImagesDelete: (items) => ipcRenderer.invoke('wordimages:delete', items),
  /**
   * 订阅生成缩略图的进度（几百张不报进度看着像卡死）。
   * 事件：{ n, total, file, name, stage: 'start' | 'done', ok?, error?, copied? }
   * 返回取消订阅的函数，组件卸载时记得调。
   */
  onWordImagesProgress: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('wordimages:progress', listener);
    return () => ipcRenderer.removeListener('wordimages:progress', listener);
  },

  // ── 视频字幕 ──
  /** 读全量视频目录（含台词进度） */
  videoLoad: () => ipcRenderer.invoke('video:load'),
  /** 抓字幕（跑 yt-dlp，耗时较长，进度走 onYtLog） */
  videoFetch: (items) => ipcRenderer.invoke('video:fetch', items),
  /** 导入本地字幕文件（vtt/srt）—— yt-dlp 抓不到时的兜底 */
  videoImport: (payload) => ipcRenderer.invoke('video:import', payload),

  /** 在网上搜视频：{ keyword, limit } → [{ videoId, title, channel, duration, url }] */
  videoSearch: (payload) => ipcRenderer.invoke('video:search', payload),
  /** 把搜到的视频加进目录（fetchSubs 为真时顺手抓字幕） */
  videoImportOnline: (payload) => ipcRenderer.invoke('video:import-online', payload),
  /**
   * 订阅 yt-dlp 的实时输出。返回取消订阅的函数，组件卸载时记得调。
   * 事件：{ type: 'start' | 'log' | 'done', id, line?, text? }
   */
  onYtLog: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('yt:log', listener);
    return () => ipcRenderer.removeListener('yt:log', listener);
  },

  // ── 歌曲 ──
  songsLoad: (courseId) => ipcRenderer.invoke('songs:load', courseId),
  songsAdd: (payload) => ipcRenderer.invoke('songs:add', payload),
  songsRemove: (payload) => ipcRenderer.invoke('songs:remove', payload),

  /** 从 gequhai.com 搜歌（按歌手名） */
  songsSearch: (singer) => ipcRenderer.invoke('songs:search', singer),
  /** 取单曲详情（LRC + 音频直链） */
  songsDetail: (id) => ipcRenderer.invoke('songs:detail', id),
  /** 下载音频 + 写歌词 + 插进 data.json */
  songsImport: (payload) => ipcRenderer.invoke('songs:import', payload),

  /** 清 jsDelivr 缓存（推完 GitHub 后前台才会更新） */
  cdnPurge: (paths) => ipcRenderer.invoke('cdn:purge', paths),
  /** 改设置（后台地址等）。返回更新后的完整 settings */
  settingsSet: (patch) => ipcRenderer.invoke('settings:set', patch),

  // ── 后台管理 ──
  /**
   * 登录后台账号取 token。token 由主进程保管并存进 settings，
   * 这里只返回脱敏后的结果（{ user, settings }）。
   */
  apiLogin: (payload) => ipcRenderer.invoke('api:login', payload),
  /**
   * 发请求到后台（自动带上主进程里的 token 和后台地址）。
   * payload: { method, path, body } → { ok, status, data }
   */
  apiRequest: (payload) => ipcRenderer.invoke('api:request', payload),
  /** 清掉本地 token */
  apiLogout: () => ipcRenderer.invoke('api:logout'),

  /** 用系统浏览器打开外链（Electron 里 window.open 会被拦） */
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
});
