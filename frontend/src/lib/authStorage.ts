export const AUTH_TOKEN_STORAGE_KEY = 'erp_foodlab.auth_token';
export const DEVELOPMENT_MODE_STORAGE_KEY = 'erp_foodlab.development_mode';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage can be unavailable (private mode); the in-memory session still works.
  }
}

export function getDevelopmentMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(DEVELOPMENT_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDevelopmentMode(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (enabled) {
      window.localStorage.setItem(DEVELOPMENT_MODE_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(DEVELOPMENT_MODE_STORAGE_KEY);
    }
  } catch {
    // The in-memory mode selection still works when storage is unavailable.
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(DEVELOPMENT_MODE_STORAGE_KEY);
  } catch {
    // Ignore storage access failures.
  }
}
