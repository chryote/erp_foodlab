export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'erp_foodlab.theme';

export const getTheme = (): Theme =>
  window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';

export const setTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const initializeTheme = (): void => {
  setTheme(getTheme());
};
