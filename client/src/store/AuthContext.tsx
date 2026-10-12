// client/src/store/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from './ThemeContext';
import { useLocale } from './LocaleContext';
import { usePreferences } from './hooks/usePreferences';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { migrateGuestEvents } from '../home/mycalendar/api';

interface User {
  id: string;
  email: string;
  nickname: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // storage.get 自带 JSON.parse 防护与坏 key 清理
    const parsed = storage.get<User>(STORAGE_KEYS.user);
    // 基本形状校验：必须是含 id/email 的对象
    if (parsed && typeof parsed === 'object' && 'id' in parsed && 'email' in parsed) {
      return parsed;
    }
    storage.remove(STORAGE_KEYS.user);
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return storage.getRaw(STORAGE_KEYS.token);
  });

  const { setTheme } = useTheme();
  const { setLocale } = useLocale();

  // 关闭自动加载：在未登录时挂载不会触发 401；登录成功后由 login() 显式 refresh
  const { refresh: refreshPrefs } = usePreferences({ autoLoad: false });

  // 清理用户级缓存：englishword_progress 是按用户缓存的进度，
  // 不清会导致下一位登录者先看到上一位的进度（拉取失败时甚至混入其账号上传）。
  // 注意 home_calendar_events 只存游客数据，不属于用户缓存，不能清
  const clearUserScopedCache = () => {
    storage.remove(STORAGE_KEYS.englishwordProgress);
  };

  // 监听 token 过期事件（request.ts 里 401 触发）：
  // 重置全局登录态，路由守卫随之把用户带回 /login
  useEffect(() => {
    const onAuthExpired = () => {
      setToken(null);
      setUser(null);
      clearUserScopedCache();
    };
    window.addEventListener('auth:expired', onAuthExpired);
    return () => window.removeEventListener('auth:expired', onAuthExpired);
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    storage.setRaw(STORAGE_KEYS.token, newToken);
    storage.set(STORAGE_KEYS.user, newUser);

    // 登录成功后，自动拉取该用户的偏好设置并同步全局 theme/locale
    const result = await refreshPrefs();
    if (result.ok && result.data) {
      const prefs = result.data;
      if (prefs.theme === 'dark') {
        setTheme('dark');
      } else if (prefs.theme === 'light') {
        setTheme('light');
      }
      if (prefs.language === 'en-US') {
        setLocale('en');
      } else if (prefs.language === 'zh-CN') {
        setLocale('zh');
      }
    }

    // 游客 → 登录：把本地游客日程搬到服务器，成功后清空本地
    // （迁移失败则保留本地，下次登录自动重试）
    await migrateGuestEvents();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.user);
    clearUserScopedCache();
  };

  // 局部更新当前用户（如自助改昵称），同步内存态与 localStorage
  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      storage.set(STORAGE_KEYS.user, next);
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
