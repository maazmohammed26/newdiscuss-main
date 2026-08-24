import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeSelector() {
  const { theme, changeTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center p-1 bg-neutral-100 dark:bg-[#1A1A1A] rounded-xl border border-neutral-200 dark:border-[#262626] w-fit shadow-xs">
      <button
        data-testid="theme-option-light"
        onClick={() => changeTheme('light')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
          !isDark
            ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80 font-bold'
            : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
        }`}
      >
        <Sun className="w-4 h-4 text-amber-500" />
        <span>Light</span>
      </button>

      <button
        data-testid="theme-option-dark"
        onClick={() => changeTheme('dark')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
          isDark
            ? 'bg-[#262626] text-white shadow-sm border border-neutral-700/80 font-bold'
            : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
        }`}
      >
        <Moon className="w-4 h-4 text-blue-400" />
        <span>Dark</span>
      </button>
    </div>
  );
}
