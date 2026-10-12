// client/src/store/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from './ThemeContext';
import { useLocale } from './LocaleContext';
import { usePreferences } from './hooks/usePreferences';

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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // localStorage 可能损坏/被篡改，JSON.parse 需防护，否则整个 App 白屏
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // 基本形状校验：必须是含 id/email 的对象
      if (parsed && typeof parsed === 'object' && 'id' in parsed && 'email' in parsed) {
        return parsed as User;
      }
      localStorage.removeItem('user');
      return null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const { setTheme } = useTheme();
  const { setLocale } = useLocale();

  // 关闭自动加载：在未登录时挂载不会触发 401；登录成功后由 login() 显式 refresh
  const { refresh: refreshPrefs } = usePreferences({ autoLoad: false });

  // 监听 token 过期事件（request.ts 里 401 触发）：
  // 重置全局登录态，路由守卫随之把用户带回 /login
  useEffect(() => {
    const onAuthExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', onAuthExpired);
    return () => window.removeEventListener('auth:expired', onAuthExpired);
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));

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
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
