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

  it('opens Input Item vendor -> Master Item Vendor with Bahan tab only (hiding Kelengkapan & Sarpras), PacketVendor.type=Bahan Pilih Vendor, and packet_vendor_id Item CRUD', async () => {
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
      { id: 3, name: 'PT. Company Bahan', series: 1, type: 'Bahan' },
    ];

    const packetVendorsStore: apiClient.PacketVendor[] = [
      { id: 10, name: 'CV. Vendor Bahan A', type: 'Bahan' },
      { id: 11, name: 'CV. Vendor Bahan B', type: 'Bahan' },
      { id: 12, name: 'CV. Vendor Kelengkapan', type: 'Kelengkapan' },
      { id: 13, name: 'CV. Vendor Sarpras', type: 'Sarpras' },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    vi.mocked(apiClient.fetchPacketVendors).mockResolvedValue({
      data: [...packetVendorsStore],
      meta: { count: packetVendorsStore.length },
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
        packet_vendor_type: [
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
        packet_vendor_id: null,
        code: 'UTM-001',
        name: 'Apple Utama Non-Vendor',
        type: 'Bahan',
        company: companiesStore[0],
        packet_vendor: null,
      },
      {
        id: 101,
        company_id: 3,
        packet_vendor_id: null,
        code: 'CMP-BHN-001',
        name: 'Gula Company Bahan',
        type: 'Bahan',
        company: companiesStore[1],
        packet_vendor: null,
      },
      {
        id: 102,
        company_id: null,
        packet_vendor_id: 10,
        code: 'BHN-001',
        name: 'Tepung Terigu Premium',
        type: 'Bahan',
        company: null,
        packet_vendor: packetVendorsStore[0],
      },
      {
        id: 103,
        company_id: null,
        packet_vendor_id: 12,
        code: 'KLP-001',
        name: 'Cup Sealer 16oz',
        type: 'Kelengkapan',
        company: null,
        packet_vendor: packetVendorsStore[2],
      },
      {
        id: 104,
        company_id: null,
        packet_vendor_id: 13,
        code: 'SRP-001',
        name: 'Booth Gerobak Portable',
        type: 'Sarpras',
        company: null,
        packet_vendor: packetVendorsStore[3],
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
        company_id: payload.company_id ?? null,
        packet_vendor_id: payload.packet_vendor_id ?? null,
        code: payload.code ?? null,
        name: payload.name,
        type: payload.type,
        company:
          companiesStore.find((c) => c.id === payload.company_id) ?? null,
        packet_vendor:
          packetVendorsStore.find((v) => v.id === payload.packet_vendor_id) ??
          null,
      };
      itemsStore = [created, ...itemsStore];
      return { data: created };
    });

    vi.mocked(apiClient.updateItem).mockImplementation(async (id, payload) => {
      const updated: apiClient.Item = {
        id,
        company_id: payload.company_id ?? null,
        packet_vendor_id: payload.packet_vendor_id ?? null,
        code: payload.code ?? null,
        name: payload.name,
        type: payload.type,
        company:
          companiesStore.find((c) => c.id === payload.company_id) ?? null,
        packet_vendor:
          packetVendorsStore.find((v) => v.id === payload.packet_vendor_id) ??
          null,
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
    expect(
      within(cpoMenu).queryByTestId('horizontal-menu-card-INPUT_ITEM_VENDOR')
    ).not.toBeInTheDocument();
    expect(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_PACKING')
    ).toBeInTheDocument();

    const inputItemCard = within(cpoMenu).getByTestId(
      'horizontal-menu-card-INPUT_ITEM'
    );
    expect(inputItemCard).toHaveTextContent('Input Item');
    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_ITEM')
    ).not.toBeInTheDocument();

    // 2. Click Input Item -> displays Master Item Vendor & Master Item Internal children
    fireEvent.click(inputItemCard);
    const submenu = screen.getByTestId('horizontal-submenu-INPUT_ITEM');
    const masterItemVendorCard = within(submenu).getByTestId(
      'horizontal-menu-card-MASTER_ITEM_VENDOR'
    );
    expect(masterItemVendorCard).toHaveTextContent('Master Item Vendor');
    expect(
      within(submenu).getByTestId('horizontal-menu-card-MASTER_ITEM_INTERNAL')
    ).toHaveTextContent('Master Item Internal');

    // 3. Click Master Item Vendor -> displays split CRUD modal with only Bahan tab visible
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
      screen.getByTestId(
        'master-item-vendor-crud-modal-packet_vendor_id-input-field'
      )
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');

    const tabBahan = screen.getByTestId('master-item-vendor-tab-Bahan');
    expect(tabBahan).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.queryByTestId('master-item-vendor-tab-Kelengkapan')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('master-item-vendor-tab-Sarpras')
    ).not.toBeInTheDocument();

    // Tab Bahan: shows only Bahan items owned by PacketVendor(type='Bahan'), hiding Company items and non-Bahan items
    const tablePanel = screen.getByTestId(
      'master-item-vendor-crud-modal-table-panel'
    );
    expect(
      await within(tablePanel).findByText('Tepung Terigu Premium')
    ).toBeInTheDocument();
    expect(within(tablePanel).getByText('CV. Vendor Bahan A')).toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Apple Utama Non-Vendor')
    ).not.toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Gula Company Bahan')
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
    ).toEqual(['Pilih vendor...', 'CV. Vendor Bahan A', 'CV. Vendor Bahan B']);
    expect(bahanVendorSelect.value).toBe('');

    expect(
      within(modal).queryByLabelText('Tipe Item')
    ).not.toBeInTheDocument();
    expect(within(modal).getByLabelText('Kode Item')).toBeInTheDocument();
    expect(
      within(tablePanel).getByRole('columnheader', { name: 'Kode Item' })
    ).toBeInTheDocument();

    // Create Bahan item sending packet_vendor_id (no company_id)
    fireEvent.change(bahanVendorSelect, { target: { value: '11' } });
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
        packet_vendor_id: 11,
        code: 'BHN-002',
        name: 'Gula Aren Cair',
        type: 'Bahan',
      });
      expect(
        within(tablePanel).getByText('Gula Aren Cair')
      ).toBeInTheDocument();
    });

    // Update Bahan item sending packet_vendor_id (including switching vendor)
    fireEvent.click(within(modal).getByTestId('edit-row-201'));
    fireEvent.change(bahanVendorSelect, { target: { value: '10' } });
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
        packet_vendor_id: 10,
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

    // Close modal
    fireEvent.click(
      within(modal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('master-item-vendor-crud-modal')
    ).not.toBeInTheDocument();
  });

  it('opens Input Item -> Master Item Internal with all ItemType tabs, company_id Pilih Perusahaan, and company_id Item CRUD', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [DEFAULT_CPO_MODULE],
      meta: { count: 1 },
    });

    const companiesStore: apiClient.Company[] = [
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1, type: 'Utama' },
      { id: 2, name: 'PT. Kemasan Nusantara', series: 1, type: 'Packing' },
    ];

    const packetVendorsStore: apiClient.PacketVendor[] = [
      { id: 10, name: 'CV. Vendor Bahan A', type: 'Bahan' },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });
    vi.mocked(apiClient.fetchPacketVendors).mockResolvedValue({
      data: [...packetVendorsStore],
      meta: { count: packetVendorsStore.length },
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
        id: 300,
        company_id: 1,
        packet_vendor_id: null,
        code: 'INT-BHN-01',
        name: 'Tepung Internal Utama',
        type: 'Bahan',
        company: companiesStore[0],
        packet_vendor: null,
      },
      {
        id: 301,
        company_id: 2,
        packet_vendor_id: null,
        code: 'INT-KLP-01',
        name: 'Kardus Packing Internal',
        type: 'Kelengkapan',
        company: companiesStore[1],
        packet_vendor: null,
      },
      {
        id: 302,
        company_id: 1,
        packet_vendor_id: null,
        code: 'INT-SRP-01',
        name: 'Timbangan Internal',
        type: 'Sarpras',
        company: companiesStore[0],
        packet_vendor: null,
      },
      {
        id: 303,
        company_id: null,
        packet_vendor_id: 10,
        code: 'VND-BHN-01',
        name: 'Gula Vendor Bahan',
        type: 'Bahan',
        company: null,
        packet_vendor: packetVendorsStore[0],
      },
    ];

    vi.mocked(apiClient.fetchItems).mockImplementation(async () => ({
      data: [...itemsStore],
      meta: { count: itemsStore.length },
    }));

    let nextId = 400;
    vi.mocked(apiClient.createItem).mockImplementation(async (payload) => {
      nextId += 1;
      const created: apiClient.Item = {
        id: nextId,
        company_id: payload.company_id ?? null,
        packet_vendor_id: payload.packet_vendor_id ?? null,
        code: payload.code ?? null,
        name: payload.name,
        type: payload.type,
        company:
          companiesStore.find((c) => c.id === payload.company_id) ?? null,
        packet_vendor: null,
      };
      itemsStore = [created, ...itemsStore];
      return { data: created };
    });

    vi.mocked(apiClient.updateItem).mockImplementation(async (id, payload) => {
      const updated: apiClient.Item = {
        id,
        company_id: payload.company_id ?? null,
        packet_vendor_id: payload.packet_vendor_id ?? null,
        code: payload.code ?? null,
        name: payload.name,
        type: payload.type,
        company:
          companiesStore.find((c) => c.id === payload.company_id) ?? null,
        packet_vendor: null,
      };
      itemsStore = itemsStore.map((item) => (item.id === id ? updated : item));
      return { data: updated };
    });

    vi.mocked(apiClient.deleteItem).mockImplementation(async (id) => {
      itemsStore = itemsStore.filter((item) => item.id !== id);
      return { message: 'Item deleted successfully.' };
    });

    renderApp();

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    fireEvent.click(within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_ITEM'));
    const submenu = screen.getByTestId('horizontal-submenu-INPUT_ITEM');
    fireEvent.click(
      within(submenu).getByTestId('horizontal-menu-card-MASTER_ITEM_INTERNAL')
    );

    const modal = await screen.findByTestId('master-item-internal-crud-modal');
    expect(modal).toBeInTheDocument();

    const tabBahan = screen.getByTestId('master-item-internal-tab-Bahan');
    const tabKelengkapan = screen.getByTestId(
      'master-item-internal-tab-Kelengkapan'
    );
    const tabSarpras = screen.getByTestId('master-item-internal-tab-Sarpras');
    expect(tabBahan).toHaveAttribute('aria-selected', 'true');

    // Shows company_id Bahan items only (excludes PacketVendor items and other ItemTypes)
    const tablePanel = screen.getByTestId(
      'master-item-internal-crud-modal-table-panel'
    );
    expect(
      await within(tablePanel).findByText('Tepung Internal Utama')
    ).toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Gula Vendor Bahan')
    ).not.toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Kardus Packing Internal')
    ).not.toBeInTheDocument();

    // Pilih Perusahaan pre-selects active company 1 and lists all companies
    const companySelect = within(modal).getByLabelText(
      'Pilih Perusahaan'
    ) as HTMLSelectElement;
    expect(companySelect.value).toBe('1');
    expect(Array.from(companySelect.options).map((o) => o.textContent)).toEqual([
      'Pilih perusahaan...',
      'PT. Slaras Nusa Foodlab',
      'PT. Kemasan Nusantara',
    ]);

    // Create internal Bahan item sending company_id (no packet_vendor_id)
    fireEvent.change(companySelect, { target: { value: '2' } });
    fireEvent.change(within(modal).getByLabelText('Kode Item'), {
      target: { value: 'INT-BHN-02' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Gula Pasir Internal' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createItem).toHaveBeenCalledWith({
        company_id: 2,
        code: 'INT-BHN-02',
        name: 'Gula Pasir Internal',
        type: 'Bahan',
      });
      expect(
        within(tablePanel).getByText('Gula Pasir Internal')
      ).toBeInTheDocument();
    });

    // Update internal item
    fireEvent.click(within(modal).getByTestId('edit-row-401'));
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Gula Halus Internal' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateItem).toHaveBeenCalledWith(401, {
        company_id: 2,
        code: 'INT-BHN-02',
        name: 'Gula Halus Internal',
        type: 'Bahan',
      });
    });

    // Delete internal item
    fireEvent.click(within(modal).getByTestId('delete-row-401'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteItem).toHaveBeenCalledWith(401);
    });

    // Switching to Kelengkapan & Sarpras tabs displays internal company items for those types
    fireEvent.click(tabKelengkapan);
    expect(
      await within(tablePanel).findByText('Kardus Packing Internal')
    ).toBeInTheDocument();

    fireEvent.click(tabSarpras);
    expect(
      await within(tablePanel).findByText('Timbangan Internal')
    ).toBeInTheDocument();
  });
});
