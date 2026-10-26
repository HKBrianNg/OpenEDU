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

  // ── 知识库配图 ──
  /** 读知识库全量条目（本地 JSON，不走 CDN） */
  kbLoad: () => ipcRenderer.invoke('kb:load'),
  /** 把勾选题目写成 _tasks/pending-images.json */
  kbSaveTasks: (items) => ipcRenderer.invoke('kb:save-tasks', items),

  // ── 视频字幕 ──
  /** 读全量视频目录（含台词进度） */
  videoLoad: () => ipcRenderer.invoke('video:load'),
  /** 抓字幕（跑 yt-dlp，耗时较长，进度走 onYtLog） */
  videoFetch: (items) => ipcRenderer.invoke('video:fetch', items),
  /** 导入本地字幕文件（vtt/srt）—— yt-dlp 抓不到时的兜底 */
  videoImport: (payload) => ipcRenderer.invoke('video:import', payload),
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
  /** 探一下 CDN 上的 data.json 现在是几条第几版（确认清缓存生效没） */
  cdnProbe: (rel) => ipcRenderer.invoke('cdn:probe', rel),
});
