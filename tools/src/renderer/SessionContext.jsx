// tools/src/renderer/SessionContext.jsx
// 全应用共用的登录态。
//
// 网页端那套是 AuthContext（token 放 localStorage）；桌面端这边换成：
// token 由主进程保管在 settings.json，渲染进程只关心「登没登录」。
// 所有功能（连本地的生图 / 字幕 / 歌曲）都要求先登录，所以登录态提到最外层。

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SessionContext = createContext(null);

// 主进程的 guard() 会把返回值包成 { ok, data } / { ok: false, error }
// （settings:get 是例外 —— 它没走 guard，返回的就是裸 settings）。
// 所以凡是 guard 过的 IPC，这里都得先解信封再用；忘了就会拿到 undefined。
function unwrap(res, what) {
  if (res?.ok) return res.data;
  throw new Error(res?.error || `${what} 失败`);
}

export function SessionProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!window.api?.settings) {
      setError('window.api 不存在 —— 这个页面必须由 Electron 加载');
      setReady(true);
      return;
    }
    window.api
      .settings()
      .then((s) => setSettings(s ?? {}))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setReady(true));
  }, []);

  // 带着 token 请求却收到 401 → 登录态过期，退回登录页。
  // apiClient 那边只管派事件，不认识 React，保持解耦。
  useEffect(() => {
    const onUnauthorized = () => {
      window.api?.apiLogout?.().then(
        (res) => setSettings(unwrap(res, '退出登录') ?? {}),
        () =>
          setSettings((prev) => ({
            ...prev,
            adminToken: null,
            adminEmail: null,
            adminName: null,
          })),
      );
    };
    window.addEventListener('api:unauthorized', onUnauthorized);
    return () => window.removeEventListener('api:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const { user, settings: next } = unwrap(
      await window.api.apiLogin({ email, password }),
      '登录',
    );
    setSettings(next);
    return user;
  }, []);

  const logout = useCallback(async () => {
    const next = unwrap(await window.api.apiLogout(), '退出登录');
    setSettings(next ?? {});
  }, []);

  const saveSettings = useCallback(async (patch) => {
    const next = unwrap(await window.api.settingsSet(patch), '保存设置');
    setSettings(next ?? {});
    return next;
  }, []);

  const value = useMemo(
    () => ({
      settings,
      ready,
      error,
      loggedIn: !!settings?.adminToken,
      login,
      logout,
      saveSettings,
    }),
    [settings, ready, error, login, logout, saveSettings],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession 必须在 SessionProvider 里面用');
  return ctx;
}

export default SessionContext;
