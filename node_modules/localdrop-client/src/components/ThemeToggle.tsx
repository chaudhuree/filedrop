import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../stores/useThemeStore';

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl glass-card" id="theme-toggle">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-2 rounded-lg transition-all duration-200 ${
            theme === value
              ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/5'
          }`}
          aria-label={`Switch to ${label} theme`}
          title={label}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
