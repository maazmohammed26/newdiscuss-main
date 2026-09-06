import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('discuss_theme');
      if (saved === 'dark' || saved === 'discuss-black') return 'dark';
      if (saved === 'light' || saved === 'discuss-light' || saved === 'discuss-retro') return 'light';
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    } catch (e) {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    // Clean out all legacy theme classes
    root.classList.remove('discuss', 'discuss-light', 'discuss-black', 'discuss-retro');

    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--splash-bg', 'oklch(0.13 0.01 265)');
      root.style.setProperty('--splash-script', 'oklch(0.96 0.005 250)');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--splash-bg', 'oklch(0.995 0.002 95)');
      root.style.setProperty('--splash-script', 'oklch(0.18 0.01 265)');
    }

    try {
      localStorage.setItem('discuss_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const changeTheme = (newTheme) => {
    const valid = (newTheme === 'dark') ? 'dark' : 'light';
    setTheme(valid);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
