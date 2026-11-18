import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCapitalCompany,
  createCompany,
  deleteCapitalCompany,
  deleteCompany,
  fetchCapitalCompanies,
  fetchCompanies,
  fetchErpModules,
  fetchHealthStatus,
  fetchLabSamples,
  updateCapitalCompany,
  updateCompany,
} from '../api/client';

describe('General API Client Contract & Error Handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends Accept: application/json header across all API client methods', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    } as Response);

    await fetchHealthStatus();
    await fetchErpModules();
    await fetchLabSamples();
    await fetchCompanies();
    await createCompany({ name: 'PT A', stakeholder_name: 'User A' });
    await updateCompany(1, { name: 'PT A2', stakeholder_name: 'User A2' });
    await deleteCompany(1);
    await fetchCapitalCompanies();
    await createCapitalCompany({ company_id: 1, capital: 1000.5 });
    await updateCapitalCompany(1, { company_id: 1, capital: 2000.75 });
    await deleteCapitalCompany(1);

    expect(globalThis.fetch).toHaveBeenCalledTimes(11);
    for (const call of vi.mocked(globalThis.fetch).mock.calls) {
      const options = call[1] as RequestInit;
      const headers = options?.headers as Record<string, string>;
      expect(headers?.Accept).toBe('application/json');
    }
  });

  it('surfaces backend JSON error message when an endpoint returns HTTP 500 or 422', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        message: "SQLSTATE[42S02]: Base table or view not found: 1146 Table 'capital_companies' doesn't exist",
      }),
    } as Response);

    await expect(fetchCapitalCompanies()).rejects.toThrow(
      /Failed to fetch capital companies: 500 - SQLSTATE\[42S02\]/
    );
  });

  it('surfaces clear diagnostic message with target URL when fetch throws NetworkError', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new TypeError('NetworkError when attempting to fetch resource.')
    );

    await expect(fetchCapitalCompanies()).rejects.toThrow(
      /Tidak dapat terhubung ke server API.*\/v1\/modules\/cfo\/capital-companies.*NetworkError/
    );
  });
});
