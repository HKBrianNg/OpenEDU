import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { storage, STORAGE_KEYS } from '../utils/storage';
// 如果桌面版有 ThemeContext / LocaleContext，取消注释下面两行并引入
// import { useTheme } from './ThemeContext';
// import { useLocale } from './LocaleContext';
// import { usePreferences } from './hooks/usePreferences';

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
  login: (token: string, user: User) => void;
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
    const parsed = storage.get<User>(STORAGE_KEYS.user);
    if (parsed && typeof parsed === 'object' && 'id' in parsed && 'email' in parsed) {
      return parsed;
    }
    storage.remove(STORAGE_KEYS.user);
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return storage.getRaw(STORAGE_KEYS.token);
  });

  // 清理用户级缓存
  const clearUserScopedCache = () => {
    storage.remove(STORAGE_KEYS.englishwordProgress);
  };

  // 监听 token 过期事件（request.ts 401 触发）
  useEffect(() => {
    const onAuthExpired = () => {
      setToken(null);
      setUser(null);
      clearUserScopedCache();
    };
    window.addEventListener('auth:expired', onAuthExpired);
    return () => window.removeEventListener('auth:expired', onAuthExpired);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    storage.setRaw(STORAGE_KEYS.token, newToken);
    storage.set(STORAGE_KEYS.user, newUser);

    // TODO: 后续接 preference 时取消注释
    // const { refresh: refreshPrefs } = usePreferences({ autoLoad: false });
    // const result = await refreshPrefs();
    // if (result.ok && result.data) {
    //   if (result.data.theme === 'dark') setTheme('dark');
    //   if (result.data.language === 'en-US') setLocale('en');
    // }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.user);
    clearUserScopedCache();
  };

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