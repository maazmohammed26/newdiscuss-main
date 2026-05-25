import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div data-testid="theme-toggle-wrapper" className="flex items-center gap-3">
      <span className="text-[13px] font-medium text-[#64748B] dark:text-[#94A3B8]">
        {isDark ? 'Dark' : 'Light'}
      </span>
      <button
        data-testid="theme-toggle-btn"
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          isDark ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
            isDark ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
