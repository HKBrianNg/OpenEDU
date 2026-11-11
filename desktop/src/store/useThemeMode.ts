import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'openedu-theme';

export function useThemeMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);
  const setTheme = (v: Theme) => setIsDark(v === 'dark');

  const theme: Theme = isDark ? 'dark' : 'light';

  return {
    isDark,
    theme,
    toggleTheme,
    setTheme
  };
}
