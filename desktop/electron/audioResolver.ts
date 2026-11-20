import { BrowserWindow } from 'electron'

const BASE = 'https://www.gequhai.com'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface AudioResolveResult {
  url: string
  code: number
  msg: string
}

export async function resolveAudioViaRenderer(
  playId: string,
  mp3Type: string,
  songId: string
): Promise<AudioResolveResult> {
  console.log('[audioResolver] start', { playId, mp3Type, songId })

  if (!songId) {
    return { url: '', code: 0, msg: 'songId missing' }
  }

  const win = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      javascript: true,
    },
  })

  win.webContents.setUserAgent(UA)

  return new Promise<AudioResolveResult>((resolve) => {
    let done = false
    let timer: NodeJS.Timeout | null = null

    const finish = (r: AudioResolveResult) => {
      if (done) return
      done = true
      if (timer) clearTimeout(timer)
      if (!win.isDestroyed()) win.destroy()
      console.log('[audioResolver] finish', r)
      resolve(r)
    }

    const injectScript = `
      (async () => {
        try {
          const pid = window.play_id || ${JSON.stringify(playId)};
          const tp = window.mp3_type || ${JSON.stringify(mp3Type)};
          const res = await fetch('${BASE}/api/music', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: new URLSearchParams({ id: pid, type: tp }).toString()
          });
          const text = await res.text();
          let j = {};
          try { j = JSON.parse(text); } catch (e) {}
          const audio =
            j?.data?.url || j?.url || j?.data?.src || j?.src ||
            (document.querySelector('audio')?.src || '');
          window.__gequhaiAudioResult = {
            url: audio || '',
            code: j?.code ?? res.status,
            msg: j?.msg || '',
            diag: { pagePlayId: pid, httpStatus: res.status, raw: text.slice(0, 160) }
          };
        } catch (e) {
          window.__gequhaiAudioResult = { url: '', code: 0, msg: String(e) };
        }
      })();
    `

    const poll = async (n: number = 0): Promise<void> => {
      if (done) return
      try {
        const r: any = await win.webContents.executeJavaScript(
          'window.__gequhaiAudioResult || null'
        )
        if (r && typeof r === 'object') {
          console.log('[audioResolver] diag', r.diag)
          finish({ url: String(r.url || ''), code: Number(r.code) || 0, msg: String(r.msg || '') })
          return
        }
        if (n >= 40) {
          finish({ url: '', code: 0, msg: 'audio result not injected' })
          return
        }
        setTimeout(() => { void poll(n + 1) }, 500)
      } catch (e) {
        finish({ url: '', code: 0, msg: String(e) })
      }
    }

    win.webContents.on('did-finish-load', () => {
      win.webContents
        .executeJavaScript(injectScript, true)
        .then(() => { void poll(0) })
        .catch((e) => finish({ url: '', code: 0, msg: String(e) }))
    })

    win.webContents.on('did-fail-load', (_e, code, desc) => {
      console.log('[audioResolver] did-fail-load', { code, desc })
      finish({ url: '', code: code || 0, msg: desc || '页面加载失败' })
    })

    win.on('closed', () => {
      finish({ url: '', code: 0, msg: '窗口意外关闭' })
    })

    timer = setTimeout(() => {
      finish({ url: '', code: 0, msg: 'resolveAudioViaRenderer 超时' })
    }, 30000)

    win.loadURL(`${BASE}/play/${songId}`, { userAgent: UA })
  })
}