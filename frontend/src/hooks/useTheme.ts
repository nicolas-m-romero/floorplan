// frontend/src/hooks/useTheme.ts
import { useEffect, useState } from 'react';
import { Theme, getActiveTheme, getStoredTheme, setTheme as persistTheme, applyTheme } from '../lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getActiveTheme());

  // Follow the OS preference as long as the user hasn't made an explicit choice.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => {
      if (getStoredTheme()) return;
      const next: Theme = e.matches ? 'light' : 'dark';
      applyTheme(next);
      setThemeState(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    persistTheme(next);
    setThemeState(next);
  };

  return { theme, toggle };
}
