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
        const diag = {};
        try {
          const pid = window.play_id || ${JSON.stringify(playId)};
          const tp = (window.mp3_type !== undefined && window.mp3_type !== null && window.mp3_type !== '')
            ? String(window.mp3_type) : ${JSON.stringify(mp3Type || '0')};
          diag.pagePlayId = pid;
          diag.mp3Type = tp;

          let audio = '';
          let apiCode = 0;
          let apiMsg = '';
          try {
            const res = await fetch('${BASE}/api/music', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'http',
                'X-Custom-Header': 'Key'
              },
              body: new URLSearchParams({ id: pid, type: tp }).toString()
            });
            const text = await res.text();
            diag.httpStatus = res.status;
            diag.raw = text.slice(0, 200);
            let j = {};
            try { j = JSON.parse(text); } catch (e) {}
            apiCode = Number(j?.code) || res.status;
            apiMsg = String(j?.msg || '');
            audio = j?.data?.url || j?.url || j?.data?.src || j?.src || '';
          } catch (e) {
            diag.fetchError = String(e);
          }

          if (!audio && typeof window.ensureMusicUrl === 'function') {
            try {
              window.ensureMusicUrl();
              audio = window.mp3_url || '';
              diag.ensureCalled = true;
            } catch (e) {
              diag.ensureError = String(e);
            }
          }

          if (!audio) {
            audio = document.querySelector('audio')?.src || '';
          }

          window.__gequhaiAudioResult = {
            url: audio || '',
            code: audio ? 200 : apiCode,
            msg: apiMsg || diag.fetchError || '',
            diag
          };
        } catch (e) {
          window.__gequhaiAudioResult = { url: '', code: 0, msg: String(e), diag };
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