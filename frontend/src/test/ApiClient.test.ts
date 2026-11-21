import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiRequestError,
  createCapitalCompany,
  createCompany,
  createEmployee,
  createExpenseCategory,
  createExpenseItem,
  createExpenseType,
  deleteCapitalCompany,
  deleteCompany,
  deleteExpenseCategory,
  deleteExpenseItem,
  deleteExpenseType,
  fetchActiveCompanyEmployees,
  fetchCapitalCompanies,
  fetchChoEnums,
  fetchCompanies,
  fetchErpModules,
  fetchExpenseCategories,
  fetchExpenseItems,
  fetchExpenseTypes,
  fetchHealthStatus,
  fetchLabSamples,
  syncActiveCompany,
  updateCapitalCompany,
  updateCompany,
  updateExpenseCategory,
  updateExpenseItem,
  updateExpenseType,
} from '../api/client';
import {
  clearActiveCompanyId,
  setActiveCompanyId,
} from '../lib/activeCompanyStorage';

describe('General API Client Contract & Error Handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    clearActiveCompanyId();
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
    await createCompany({ name: 'PT A' });
    await updateCompany(1, { name: 'PT A2' });
    await deleteCompany(1);
    await fetchCapitalCompanies();
    await createCapitalCompany({
      company_id: 1,
      stakeholder_name: 'Rian',
      capital: 1000.5,
    });
    await updateCapitalCompany(1, {
      company_id: 1,
      stakeholder_name: 'Siti Aminah',
      capital: 2000.75,
    });
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

  it('throws ApiRequestError with status and field errors on HTTP 422 validation failure', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        message: 'NIK KTP sudah terdaftar.',
        errors: {
          nik_ktp: ['NIK KTP sudah terdaftar.'],
          documents: ['Dokumen karyawan minimal harus melampirkan 1 dokumen.'],
        },
      }),
    } as Response);

    try {
      await createEmployee({ company_id: 1, name: 'Test' });
      expect.unreachable('Expected ApiRequestError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      const apiErr = err as ApiRequestError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.errors).toEqual({
        nik_ktp: ['NIK KTP sudah terdaftar.'],
        documents: ['Dokumen karyawan minimal harus melampirkan 1 dokumen.'],
      });
    }
  });

  it('surfaces clear diagnostic message with target URL when fetch throws NetworkError', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new TypeError('NetworkError when attempting to fetch resource.')
    );

    await expect(fetchCapitalCompanies()).rejects.toThrow(
      /Tidak dapat terhubung ke server API.*\/v1\/modules\/cfo\/capital-companies.*NetworkError/
    );
  });

  it('passes resource id via URL path parameter and never inside request body across all CRUD endpoints', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    } as Response);

    await updateCompany(10, { name: 'PT Updated', series: 2 });
    await deleteCompany(10);
    await updateCapitalCompany(20, {
      company_id: 10,
      stakeholder_name: 'Rian',
      capital: 500000,
    });
    await deleteCapitalCompany(20);
    await updateExpenseCategory(30, { company_id: 10, name: 'Kategori Baru' });
    await deleteExpenseCategory(30);
    await updateExpenseType(40, {
      company_id: 10,
      expense_category_id: 30,
      name: 'Tipe Baru',
    });
    await deleteExpenseType(40);
    await updateExpenseItem(50, {
      company_id: 10,
      expense_category_id: 30,
      expense_type_id: 40,
      name: 'Item Baru',
      amount: 120000,
      purchased_on: '2026-11-19',
      detail: 'Catatan',
    });
    await deleteExpenseItem(50);

    // Ensure list/create also work cleanly
    await fetchExpenseCategories();
    await createExpenseCategory({ company_id: 10, name: 'Cat' });
    await fetchExpenseTypes();
    await createExpenseType({
      company_id: 10,
      expense_category_id: 30,
      name: 'Type',
    });
    await fetchExpenseItems();
    await createExpenseItem({
      company_id: 10,
      expense_category_id: 30,
      expense_type_id: 40,
      name: 'Item',
      amount: 1000,
      purchased_on: '2026-11-19',
    });

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const expectedUpdateUrls = [
      '/v1/modules/cfo/companies/10',
      '/v1/modules/cfo/capital-companies/20',
      '/v1/modules/cfo/expense-categories/30',
      '/v1/modules/cfo/expense-types/40',
      '/v1/modules/cfo/expense-items/50',
    ];
    for (let i = 0; i < expectedUpdateUrls.length; i++) {
      const [updateUrl, updateOpts] = calls[i * 2] as [string, RequestInit];
      const [deleteUrl, deleteOpts] = calls[i * 2 + 1] as [string, RequestInit];
      expect(updateUrl.endsWith(expectedUpdateUrls[i])).toBe(true);
      expect(updateOpts.method).toBe('PUT');
      const parsedBody = JSON.parse(String(updateOpts.body)) as Record<
        string,
        unknown
      >;
      expect(parsedBody).not.toHaveProperty('id');

      expect(deleteUrl.endsWith(expectedUpdateUrls[i])).toBe(true);
      expect(deleteOpts.method).toBe('DELETE');
      expect(deleteOpts.body).toBeUndefined();
    }
  });

  it('sends X-Active-Company-Id header when an active company is stored and calls CHO active company endpoints', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    } as Response);

    setActiveCompanyId(7);
    await fetchChoEnums();
    await fetchActiveCompanyEmployees();
    await syncActiveCompany(7);

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(3);
    for (const call of calls) {
      const options = call[1] as RequestInit;
      const headers = options.headers as Record<string, string>;
      expect(headers['X-Active-Company-Id']).toBe('7');
    }
    expect(String(calls[1][0])).toContain('/v1/modules/cho/employees?active_company=1');
    expect(String(calls[2][0])).toContain('/v1/active-company');
  });
});
