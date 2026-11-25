import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as apiClient from '../api/client';
import { clearActiveCompanyId } from '../lib/activeCompanyStorage';
import { DEFAULT_CDO_MODULE } from '../modules/CDO/CdoModuleCard';
import { DEFAULT_CFO_MODULE } from '../modules/CFO/CfoModuleCard';
import { DEFAULT_CHO_MODULE } from '../modules/CHO/ChoModuleCard';
import { DEFAULT_CMO_MODULE } from '../modules/CMO/CmoModuleCard';
import { DEFAULT_CPO_MODULE } from '../modules/CPO/CpoModuleCard';

vi.mock('../api/client');

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/dashboard-flow-simulator']}>
      <App />
    </MemoryRouter>
  );
}

describe('CPO Input Item vendor flow: Master Item Vendor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearActiveCompanyId();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    clearActiveCompanyId();
    window.localStorage.clear();
  });

  it('opens Input Item vendor -> Master Item Vendor with per-ItemType tabs, CompanyType-filtered Pilih Vendor, and full Item CRUD', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [
        DEFAULT_CFO_MODULE,
        DEFAULT_CHO_MODULE,
        DEFAULT_CPO_MODULE,
        DEFAULT_CDO_MODULE,
        DEFAULT_CMO_MODULE,
      ],
      meta: { count: 5 },
    });

    const companiesStore: apiClient.Company[] = [
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1, type: 'Utama' },
      { id: 2, name: 'PT. Kemasan Nusantara', series: 1, type: 'Packing' },
      { id: 3, name: 'PT. Vendor Bahan A', series: 1, type: 'Bahan' },
      { id: 4, name: 'PT. Vendor Bahan B', series: 1, type: 'Bahan' },
      {
        id: 5,
        name: 'PT. Vendor Kelengkapan',
        series: 1,
        type: 'Kelengkapan',
      },
      { id: 6, name: 'PT. Vendor Sarpras', series: 1, type: 'Sarpras' },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (id) => ({
      data: companiesStore.find((c) => c.id === id) ?? null,
    }));

    vi.mocked(apiClient.fetchCpoEnums).mockResolvedValue({
      data: {
        item_type: [
          { value: 'Bahan', nama: 'Bahan' },
          { value: 'Kelengkapan', nama: 'Kelengkapan' },
          { value: 'Sarpras', nama: 'Sarpras' },
        ],
      },
    });

    let itemsStore: apiClient.Item[] = [
      {
        id: 100,
        company_id: 1,
        code: 'UTM-001',
        name: 'Apple Utama Non-Vendor',
        type: 'Bahan',
        company: companiesStore[0],
      },
      {
        id: 101,
        company_id: 3,
        code: 'BHN-001',
        name: 'Tepung Terigu Premium',
        type: 'Bahan',
        company: companiesStore[2],
      },
      {
        id: 102,
        company_id: 5,
        code: 'KLP-001',
        name: 'Cup Sealer 16oz',
        type: 'Kelengkapan',
        company: companiesStore[4],
      },
      {
        id: 104,
        company_id: 2,
        code: 'PCK-001',
        name: 'Kardus Packing Non-Kelengkapan',
        type: 'Kelengkapan',
        company: companiesStore[1],
      },
      {
        id: 103,
        company_id: 6,
        code: 'SRP-001',
        name: 'Booth Gerobak Portable',
        type: 'Sarpras',
        company: companiesStore[5],
      },
      {
        id: 105,
        company_id: 1,
        code: 'UTM-002',
        name: 'Rak Utama Non-Sarpras',
        type: 'Sarpras',
        company: companiesStore[0],
      },
    ];

    vi.mocked(apiClient.fetchItems).mockImplementation(async () => ({
      data: [...itemsStore],
      meta: { count: itemsStore.length },
    }));

    let nextId = 200;
    vi.mocked(apiClient.createItem).mockImplementation(async (payload) => {
      nextId += 1;
      const created: apiClient.Item = {
        id: nextId,
        company_id: payload.company_id,
        code: payload.code ?? null,
        name: payload.name,
        type: payload.type,
        company:
          companiesStore.find((c) => c.id === payload.company_id) ?? null,
      };
      itemsStore = [created, ...itemsStore];
      return { data: created };
    });

    vi.mocked(apiClient.updateItem).mockImplementation(async (id, payload) => {
      const updated: apiClient.Item = {
        id,
        company_id: payload.company_id,
        code: payload.code ?? null,
        name: payload.name,
        type: payload.type,
        company:
          companiesStore.find((c) => c.id === payload.company_id) ?? null,
      };
      itemsStore = itemsStore.map((item) => (item.id === id ? updated : item));
      return { data: updated };
    });

    vi.mocked(apiClient.deleteItem).mockImplementation(async (id) => {
      itemsStore = itemsStore.filter((item) => item.id !== id);
      return { message: 'Item deleted successfully.' };
    });

    renderApp();

    // 1. Select company & open CPO module
    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    const inputItemVendorCard = within(cpoMenu).getByTestId(
      'horizontal-menu-card-INPUT_ITEM_VENDOR'
    );
    expect(inputItemVendorCard).toHaveTextContent('Input Item vendor');
    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_ITEM_VENDOR')
    ).not.toBeInTheDocument();

    // 2. Click Input Item vendor -> displays Master Item Vendor child
    fireEvent.click(inputItemVendorCard);
    const submenu = screen.getByTestId('horizontal-submenu-INPUT_ITEM_VENDOR');
    const masterItemVendorCard = within(submenu).getByTestId(
      'horizontal-menu-card-MASTER_ITEM_VENDOR'
    );
    expect(masterItemVendorCard).toHaveTextContent('Master Item Vendor');

    // 3. Click Master Item Vendor -> displays split CRUD modal
    fireEvent.click(masterItemVendorCard);
    const modal = await screen.findByTestId('master-item-vendor-crud-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('master-item-vendor-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-item-vendor-crud-modal-form-panel')
    );
    expect(
      screen.getByTestId('master-item-vendor-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-item-vendor-crud-modal-table-panel')
    );
    expect(
      screen.getByTestId('master-item-vendor-crud-modal-company_id-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');

    const tabBahan = screen.getByTestId('master-item-vendor-tab-Bahan');
    const tabKelengkapan = screen.getByTestId(
      'master-item-vendor-tab-Kelengkapan'
    );
    const tabSarpras = screen.getByTestId('master-item-vendor-tab-Sarpras');
    expect(tabBahan).toHaveAttribute('aria-selected', 'true');

    // Tab Bahan: shows only Bahan items from CompanyType === 'Bahan' and filters Pilih Vendor by CompanyType === 'Bahan'
    const tablePanel = screen.getByTestId(
      'master-item-vendor-crud-modal-table-panel'
    );
    expect(
      await within(tablePanel).findByText('Tepung Terigu Premium')
    ).toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Apple Utama Non-Vendor')
    ).not.toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Cup Sealer 16oz')
    ).not.toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Booth Gerobak Portable')
    ).not.toBeInTheDocument();

    const bahanVendorSelect = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    expect(
      Array.from(bahanVendorSelect.options).map((opt) => opt.textContent)
    ).toEqual(['Pilih vendor...', 'PT. Vendor Bahan A', 'PT. Vendor Bahan B']);
    expect(bahanVendorSelect.value).toBe('');

    expect(
      within(modal).queryByLabelText('Tipe Item')
    ).not.toBeInTheDocument();
    expect(within(modal).getByLabelText('Kode Item')).toBeInTheDocument();
    expect(
      within(tablePanel).getByRole('columnheader', { name: 'Kode Item' })
    ).toBeInTheDocument();

    // Create Bahan item
    fireEvent.change(bahanVendorSelect, { target: { value: '4' } });
    fireEvent.change(within(modal).getByLabelText('Kode Item'), {
      target: { value: 'BHN-002' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Gula Aren Cair' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createItem).toHaveBeenCalledWith({
        company_id: 4,
        code: 'BHN-002',
        name: 'Gula Aren Cair',
        type: 'Bahan',
      });
      expect(
        within(tablePanel).getByText('Gula Aren Cair')
      ).toBeInTheDocument();
    });

    // Update Bahan item
    fireEvent.click(within(modal).getByTestId('edit-row-201'));
    fireEvent.change(within(modal).getByLabelText('Kode Item'), {
      target: { value: '' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Gula Aren Organik' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateItem).toHaveBeenCalledWith(201, {
        company_id: 4,
        code: null,
        name: 'Gula Aren Organik',
        type: 'Bahan',
      });
      expect(
        within(tablePanel).getByText('Gula Aren Organik')
      ).toBeInTheDocument();
    });

    // Delete Bahan item
    fireEvent.click(within(modal).getByTestId('delete-row-201'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteItem).toHaveBeenCalledWith(201);
      expect(
        within(tablePanel).queryByText('Gula Aren Organik')
      ).not.toBeInTheDocument();
    });

    // Tab Kelengkapan: shows only Kelengkapan items from CompanyType === 'Kelengkapan' & filters Pilih Vendor to Kelengkapan companies
    fireEvent.click(tabKelengkapan);
    expect(tabKelengkapan).toHaveAttribute('aria-selected', 'true');
    expect(
      await within(tablePanel).findByText('Cup Sealer 16oz')
    ).toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Kardus Packing Non-Kelengkapan')
    ).not.toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Tepung Terigu Premium')
    ).not.toBeInTheDocument();

    const kelengkapanVendorSelect = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    expect(
      Array.from(kelengkapanVendorSelect.options).map((opt) => opt.textContent)
    ).toEqual(['Pilih vendor...', 'PT. Vendor Kelengkapan']);
    expect(
      within(modal).queryByLabelText('Tipe Item')
    ).not.toBeInTheDocument();
    expect(within(modal).getByLabelText('Kode Item')).toBeInTheDocument();
    expect(
      within(tablePanel).getByRole('columnheader', { name: 'Kode Item' })
    ).toBeInTheDocument();

    fireEvent.change(kelengkapanVendorSelect, { target: { value: '5' } });
    fireEvent.change(within(modal).getByLabelText('Kode Item'), {
      target: { value: 'KLP-002' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Sedotan Steril' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createItem).toHaveBeenCalledWith({
        company_id: 5,
        code: 'KLP-002',
        name: 'Sedotan Steril',
        type: 'Kelengkapan',
      });
      expect(
        within(tablePanel).getByText('Sedotan Steril')
      ).toBeInTheDocument();
    });

    // Tab Sarpras: shows only Sarpras items from CompanyType === 'Sarpras' & filters Pilih Vendor to Sarpras companies
    fireEvent.click(tabSarpras);
    expect(tabSarpras).toHaveAttribute('aria-selected', 'true');
    expect(
      await within(tablePanel).findByText('Booth Gerobak Portable')
    ).toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Rak Utama Non-Sarpras')
    ).not.toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Cup Sealer 16oz')
    ).not.toBeInTheDocument();

    const sarprasVendorSelect = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    expect(
      Array.from(sarprasVendorSelect.options).map((opt) => opt.textContent)
    ).toEqual(['Pilih vendor...', 'PT. Vendor Sarpras']);
    expect(
      within(modal).queryByLabelText('Tipe Item')
    ).not.toBeInTheDocument();
    expect(
      within(modal).queryByLabelText('Kode Item')
    ).not.toBeInTheDocument();
    expect(
      within(tablePanel).queryByRole('columnheader', { name: 'Kode Item' })
    ).not.toBeInTheDocument();

    fireEvent.change(sarprasVendorSelect, { target: { value: '6' } });
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Etalase Kaca' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createItem).toHaveBeenCalledWith({
        company_id: 6,
        code: null,
        name: 'Etalase Kaca',
        type: 'Sarpras',
      });
      expect(within(tablePanel).getByText('Etalase Kaca')).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(
      within(modal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('master-item-vendor-crud-modal')
    ).not.toBeInTheDocument();
  });

  it('pre-selects the active header company in Pilih Vendor only when its CompanyType matches the active tab', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [DEFAULT_CPO_MODULE],
      meta: { count: 1 },
    });

    const companiesStore: apiClient.Company[] = [
      {
        id: 10,
        name: 'PT. Vendor Kelengkapan',
        series: 1,
        type: 'Kelengkapan',
      },
      { id: 11, name: 'PT. Vendor Bahan', series: 1, type: 'Bahan' },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: companiesStore,
      meta: { count: companiesStore.length },
    });
    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (id) => ({
      data: companiesStore.find((c) => c.id === id) ?? null,
    }));
    vi.mocked(apiClient.fetchCpoEnums).mockResolvedValue({
      data: {
        item_type: [
          { value: 'Bahan', nama: 'Bahan' },
          { value: 'Kelengkapan', nama: 'Kelengkapan' },
          { value: 'Sarpras', nama: 'Sarpras' },
        ],
      },
    });
    vi.mocked(apiClient.fetchItems).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });

    renderApp();

    // Select Kelengkapan company in header
    fireEvent.click(await screen.findByTestId('company-tab-10'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    fireEvent.click(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_ITEM_VENDOR')
    );
    const submenu = screen.getByTestId('horizontal-submenu-INPUT_ITEM_VENDOR');
    fireEvent.click(
      within(submenu).getByTestId('horizontal-menu-card-MASTER_ITEM_VENDOR')
    );

    const modal = await screen.findByTestId('master-item-vendor-crud-modal');

    // On Bahan tab, Kelengkapan company is not a Bahan vendor, so Pilih Vendor starts empty
    const vendorSelectBahan = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    expect(vendorSelectBahan.value).toBe('');

    // Switching to Kelengkapan tab pre-selects company 10 because its CompanyType matches Kelengkapan
    fireEvent.click(screen.getByTestId('master-item-vendor-tab-Kelengkapan'));
    const vendorSelectKelengkapan = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    expect(vendorSelectKelengkapan.value).toBe('10');
  });
});
