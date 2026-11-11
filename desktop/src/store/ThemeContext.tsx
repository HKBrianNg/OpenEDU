// desktop/src/store/ThemeContext.tsx
import React, { createContext, useContext } from 'react';
import { useThemeMode, Theme } from './useThemeMode';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (value: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useThemeMode();
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
