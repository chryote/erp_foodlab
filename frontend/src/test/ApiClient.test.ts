import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiRequestError,
  createCapitalCompany,
  createCompany,
  createDefaultPackage,
  createEmployee,
  createExpenseCategory,
  createExpenseItem,
  createExpenseType,
  createIngredient,
  createItem,
  createItemPacket,
  createPacket,
  createPacketCategory,
  createPacketName,
  createPacketVendor,
  deleteCapitalCompany,
  deleteCompany,
  deleteDefaultPackage,
  deleteExpenseCategory,
  deleteExpenseItem,
  deleteExpenseType,
  deleteIngredient,
  deleteItem,
  deleteItemPacket,
  deletePacket,
  deletePacketCategory,
  deletePacketName,
  deletePacketVendor,
  fetchActiveCompanyEmployees,
  fetchCapitalCompanies,
  fetchCfoEnums,
  fetchChoEnums,
  fetchCompanies,
  fetchCpoEnums,
  fetchDefaultPackages,
  fetchErpModules,
  fetchExpenseCategories,
  fetchExpenseItems,
  fetchExpenseTypes,
  fetchEmployees,
  fetchHealthStatus,
  fetchIngredients,
  fetchItemPackets,
  fetchItems,
  fetchLabSamples,
  fetchPacketCategories,
  fetchPacketNames,
  fetchPackets,
  fetchPacketVendors,
  syncActiveCompany,
  updateCapitalCompany,
  updateCompany,
  updateDefaultPackage,
  updateExpenseCategory,
  updateExpenseItem,
  updateExpenseType,
  updateIngredient,
  updateItem,
  updateItemPacket,
  updatePacket,
  updatePacketCategory,
  updatePacketName,
  updatePacketVendor,
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
    await fetchCfoEnums();
    await fetchCompanies();
    await createCompany({ name: 'PT A', type: 'Packing' });
    await updateCompany(1, { name: 'PT A2', type: 'Sarpras' });
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

    expect(globalThis.fetch).toHaveBeenCalledTimes(12);
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

  it('calls CPO packing endpoints for items, packets, and item-packets', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    } as Response);

    await fetchCpoEnums();
    await fetchItems();
    await createItem({ company_id: 1, code: 'ITM-001', name: 'Kardus', type: 'Bahan' });
    await updateItem(5, { company_id: 1, code: null, name: 'Kardus Baru', type: 'Peralatan' });
    await deleteItem(5);

    await fetchPackets();
    await createPacket({ name: 'Paket A' });
    await updatePacket(6, { name: 'Paket B' });
    await deletePacket(6);

    await fetchItemPackets();
    await createItemPacket({ company_id: 1, packet_id: 6, item_id: 5, quantity: 3 });
    await updateItemPacket(7, { company_id: 1, packet_id: 6, item_id: 5, quantity: 4 });
    await deleteItemPacket(7);

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(13);
    expect(String(calls[0][0])).toContain('/v1/modules/cpo/enums');
    expect(String(calls[1][0])).toContain('/v1/modules/cpo/items');
    expect(String(calls[3][0])).toContain('/v1/modules/cpo/items/5');
    expect(String(calls[5][0])).toContain('/v1/modules/cpo/packets');
    expect(String(calls[7][0])).toContain('/v1/modules/cpo/packets/6');
    expect(String(calls[9][0])).toContain('/v1/modules/cpo/item-packets');
    expect(String(calls[11][0])).toContain('/v1/modules/cpo/item-packets/7');
  });

  it('calls CPO paket master endpoints for packet-names, packet-vendors, and packet-categories', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    } as Response);

    await fetchPacketNames();
    await createPacketName({ name: 'Paket Starter' });
    await updatePacketName(1, { name: 'Paket Starter Pro' });
    await deletePacketName(1);

    await fetchPacketVendors();
    await createPacketVendor({ name: 'Vendor A' });
    await updatePacketVendor(2, { name: 'Vendor B' });
    await deletePacketVendor(2);

    await fetchPacketCategories();
    await createPacketCategory({ name: 'Kategori A' });
    await updatePacketCategory(3, { name: 'Kategori B' });
    await deletePacketCategory(3);

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(12);
    expect(String(calls[0][0])).toContain('/v1/modules/cpo/packet-names');
    expect(String(calls[2][0])).toContain('/v1/modules/cpo/packet-names/1');
    expect(String(calls[4][0])).toContain('/v1/modules/cpo/packet-vendors');
    expect(String(calls[6][0])).toContain('/v1/modules/cpo/packet-vendors/2');
    expect(String(calls[8][0])).toContain('/v1/modules/cpo/packet-categories');
    expect(String(calls[10][0])).toContain(
      '/v1/modules/cpo/packet-categories/3'
    );
  });

  it('calls CPO default-packages endpoints for CRUD', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    } as Response);

    await fetchDefaultPackages();
    await createDefaultPackage({
      brand_name: 'Brand Hemat',
      packet_name_id: 1,
      packet_vendor_id: 2,
      packet_category_id: 3,
      item_packet_id: 4,
      price: 25000,
    });
    await updateDefaultPackage(9, {
      brand_name: 'Brand Hemat Pro',
      packet_name_id: 1,
      packet_vendor_id: 2,
      packet_category_id: 3,
      item_packet_id: 4,
      price: 30000,
    });
    await deleteDefaultPackage(9);

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(4);
    expect(String(calls[0][0])).toContain('/v1/modules/cpo/default-packages');
    expect(String(calls[1][0])).toContain('/v1/modules/cpo/default-packages');
    expect(String(calls[2][0])).toContain('/v1/modules/cpo/default-packages/9');
    expect(String(calls[3][0])).toContain('/v1/modules/cpo/default-packages/9');
  });

  it('calls CPO ingredients endpoints for CRUD', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    } as Response);

    await fetchIngredients();
    await createIngredient({
      default_package_id: 1,
      item_id: 2,
      price: 12000,
    });
    await updateIngredient(8, {
      default_package_id: 1,
      item_id: 2,
      price: 15000,
    });
    await deleteIngredient(8);

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(4);
    expect(String(calls[0][0])).toContain('/v1/modules/cpo/ingredients');
    expect(String(calls[1][0])).toContain('/v1/modules/cpo/ingredients');
    expect(String(calls[2][0])).toContain('/v1/modules/cpo/ingredients/8');
    expect(String(calls[3][0])).toContain('/v1/modules/cpo/ingredients/8');
  });

  it('sends pagination and filter parameters for CFO operational lists', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: { count: 0 } }),
    } as Response);

    await fetchExpenseCategories({
      page: 2,
      per_page: 10,
      company_id: 21,
      search: ' Bahan Baku ',
      sort: 'name',
    });
    await fetchExpenseTypes({
      page: 1,
      per_page: 10,
      company_id: 21,
      expense_category_id: 31,
      sort: '-name',
    });
    await fetchExpenseItems({
      page: 3,
      per_page: 10,
      company_id: 21,
      expense_category_id: 31,
      expense_type_id: 41,
      search: 'Susu',
      sort: '-purchased_on',
      date_from: '2026-11-01',
      date_to: '2026-11-30',
    });

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const categoryUrl = new URL(String(calls[0][0]), 'http://localhost');
    const typeUrl = new URL(String(calls[1][0]), 'http://localhost');
    const itemUrl = new URL(String(calls[2][0]), 'http://localhost');

    expect(categoryUrl.pathname).toContain('/expense-categories');
    expect(categoryUrl.searchParams.get('page')).toBe('2');
    expect(categoryUrl.searchParams.get('per_page')).toBe('10');
    expect(categoryUrl.searchParams.get('filter[company_id]')).toBe('21');
    expect(categoryUrl.searchParams.get('filter[search]')).toBe('Bahan Baku');
    expect(categoryUrl.searchParams.get('sort')).toBe('name');

    expect(typeUrl.searchParams.get('filter[expense_category_id]')).toBe('31');
    expect(typeUrl.searchParams.get('sort')).toBe('-name');

    expect(itemUrl.searchParams.get('page')).toBe('3');
    expect(itemUrl.searchParams.get('filter[expense_category_id]')).toBe('31');
    expect(itemUrl.searchParams.get('filter[expense_type_id]')).toBe('41');
    expect(itemUrl.searchParams.get('filter[search]')).toBe('Susu');
    expect(itemUrl.searchParams.get('sort')).toBe('-purchased_on');
    expect(itemUrl.searchParams.get('filter[date_from]')).toBe('2026-11-01');
    expect(itemUrl.searchParams.get('filter[date_to]')).toBe('2026-11-30');
  });

  it('sends employee search as a filter parameter', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], meta: { count: 0 } }),
    } as Response);

    await fetchEmployees({
      page: 1,
      per_page: 10,
      company_id: 21,
      search: ' Budi ',
    });

    const employeeUrl = new URL(
      String(vi.mocked(globalThis.fetch).mock.calls[0][0]),
      'http://localhost'
    );

    expect(employeeUrl.pathname).toContain('/v1/modules/cho/employees');
    expect(employeeUrl.searchParams.get('filter[search]')).toBe('Budi');
    expect(employeeUrl.searchParams.has('search')).toBe(false);
  });
});
