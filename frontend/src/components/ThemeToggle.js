import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div data-testid="theme-toggle-wrapper" className="flex items-center gap-2.5 select-none">
      <button
        data-testid="theme-toggle-btn"
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
          isDark ? 'bg-[#0095F6]' : 'bg-neutral-300'
        }`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      >
        <span
          className={`inline-flex items-center justify-center h-4.5 w-4.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
            isDark ? 'translate-x-[22px]' : 'translate-x-[3px]'
          }`}
        >
          {isDark ? (
            <Moon className="w-2.5 h-2.5 text-[#0095F6]" />
          ) : (
            <Sun className="w-2.5 h-2.5 text-amber-500" />
          )}
        </span>
      </button>
      <span className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </div>
  );
}
