export const ACTIVE_COMPANY_STORAGE_KEY = 'erp_foodlab.active_company_id';

let inMemoryActiveCompanyId: number | null = null;

export function getActiveCompanyId(): number | null {
  if (inMemoryActiveCompanyId !== null) {
    return inMemoryActiveCompanyId;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      inMemoryActiveCompanyId = parsed;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveCompanyId(companyId: number | null): void {
  const normalized =
    typeof companyId === 'number' &&
    Number.isInteger(companyId) &&
    companyId > 0
      ? companyId
      : null;

  inMemoryActiveCompanyId = normalized;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (normalized !== null) {
      window.localStorage.setItem(
        ACTIVE_COMPANY_STORAGE_KEY,
        String(normalized)
      );
    } else {
      window.localStorage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
    }
  } catch {
    // In-memory active company still works when storage is unavailable.
  }
}

export function clearActiveCompanyId(): void {
  setActiveCompanyId(null);
}
