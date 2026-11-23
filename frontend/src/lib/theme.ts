import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'erp_foodlab.theme';
const themeSubscribers = new Set<() => void>();
const getServerTheme = (): Theme => 'light';

export const getTheme = (): Theme =>
  window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';

const notifyThemeSubscribers = () => {
  themeSubscribers.forEach((subscriber) => subscriber());
};

export const subscribeToTheme = (subscriber: () => void) => {
  themeSubscribers.add(subscriber);
  return () => {
    themeSubscribers.delete(subscriber);
  };
};

export const setTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  notifyThemeSubscribers();
};

export const initializeTheme = (): void => {
  setTheme(getTheme());
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) {
      return;
    }

    document.documentElement.dataset.theme =
      event.newValue === 'dark' ? 'dark' : 'light';
    notifyThemeSubscribers();
  });
}

export const useTheme = (): Theme =>
  useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);
