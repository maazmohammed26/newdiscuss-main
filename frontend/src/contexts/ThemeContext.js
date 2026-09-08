import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const ThemeContext = createContext(null);

const getInitialSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('discuss_theme');
      if (saved === 'system') return 'system';
      if (saved === 'dark' || saved === 'discuss-black') return 'dark';
      if (saved === 'light' || saved === 'discuss-light' || saved === 'discuss-retro') return 'light';
      return 'light';
    } catch (e) {
      return 'light';
    }
  });

  const [systemTheme, setSystemTheme] = useState(getInitialSystemTheme);

  // Listen to OS prefers-color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Persist preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('discuss_theme', themeMode);
    } catch (e) {}
  }, [themeMode]);

  const setTheme = useCallback((mode) => {
    if (mode === 'system' || mode === 'dark' || mode === 'light') {
      setThemeMode(mode);
    } else {
      setThemeMode('light');
    }
  }, []);

  const changeTheme = useCallback((mode) => {
    setTheme(mode);
  }, [setTheme]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const currentResolved = prev === 'system' ? systemTheme : prev;
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  }, [systemTheme]);

  // Resolved active theme ('light' or 'dark')
  const resolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, systemTheme]);

  const value = useMemo(() => ({
    theme: resolvedTheme,
    themeMode,
    setTheme,
    changeTheme,
    toggleTheme,
  }), [resolvedTheme, themeMode, setTheme, changeTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

