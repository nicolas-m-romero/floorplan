// frontend/src/lib/theme.ts
// Light/dark theme management. The initial theme is applied before React mounts
// by the inline script in index.html; this module keeps it in sync afterwards.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'floorcraft-theme';

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** The user's explicit choice, falling back to the system preference. */
export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

/** The theme currently applied to the document. */
export function getActiveTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === 'light' ? 'light' : t === 'dark' ? 'dark' : resolveTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Persist an explicit choice and apply it. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
  applyTheme(theme);
}
