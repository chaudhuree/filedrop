import { create } from 'zustand';
import { THEME_KEY } from '../utils/constants';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.body.classList.toggle('dark', resolved === 'dark');
}

const savedTheme = (localStorage.getItem(THEME_KEY) as Theme) || 'dark';
const initialResolved = resolveTheme(savedTheme);
applyTheme(initialResolved);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: savedTheme,
  resolved: initialResolved,

  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(resolved);
    set({ theme, resolved });
  },
}));

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const state = useThemeStore.getState();
  if (state.theme === 'system') {
    const resolved = getSystemTheme();
    applyTheme(resolved);
    useThemeStore.setState({ resolved });
  }
});
