// client/src/store/AuthContext.tsx

import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from './ThemeContext';
import { useLocale } from './LocaleContext';
import { api } from '../utils/request';

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
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const { setTheme } = useTheme();
  const { setLocale } = useLocale();

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));

    // 登录成功后，自动拉取该用户的偏好设置
    try {
      // token 已在上方写入 localStorage，统一模块会自动携带
      const res = await api.get('/api/preferences');

      if (res.ok) {
        const prefs = res.data.data;  // ✅ 关键修复：后端返回 { data: {...} }

        // 同步主题（后端返回 theme: 'light' | 'dark' | 'system'）
        if (prefs.theme === 'dark') {
          setTheme('dark');
        } else if (prefs.theme === 'light') {
          setTheme('light');
        }
        
        // 同步语言（后端返回 language: 'zh-CN' | 'en-US'）
        if (prefs.language === 'en-US') {
          setLocale('en');
        } else if (prefs.language === 'zh-CN') {
          setLocale('zh');
        }
      }
    } catch (e) {
      // 静默失败，不阻塞登录流程
      console.warn('Failed to load preferences:', e);
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