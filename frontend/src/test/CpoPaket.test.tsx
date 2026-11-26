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

describe('CPO Input Paket flow: Master Paket (Paket & Paket Awal)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearActiveCompanyId();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    clearActiveCompanyId();
    window.localStorage.clear();
  });

  it('shows Input Paket -> Master Paket modal with Paket tab and Paket Awal (DefaultPackage) tab', async () => {
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
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
      { id: 2, name: 'PT. Pangan Nusantara', series: 1 },
      { id: 3, name: 'PT. Kuliner Mandiri', series: 1 },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (id) => ({
      data: companiesStore.find((c) => c.id === id) ?? null,
    }));

    let packetNamesStore: apiClient.PacketName[] = [
      { id: 1, name: 'Paket Starter' },
    ];
    let packetVendorsStore: apiClient.PacketVendor[] = [
      { id: 1, name: 'Vendor Nusantara', type: 'Bahan' },
    ];
    let packetCategoriesStore: apiClient.PacketCategory[] = [
      { id: 1, name: 'Kategori Reguler' },
    ];

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
    const itemPacketsStore: apiClient.ItemPacket[] = [
      {
        id: 10,
        company_id: 1,
        packet_id: 20,
        item_id: 30,
        quantity: 2,
        company: companiesStore[0],
        packet: { id: 20, name: 'Paket Dasar' },
        item: {
          id: 30,
          company_id: 1,
          code: 'ITM-001',
          name: 'Kardus Packing',
          type: 'Bahan',
        },
      },
      {
        id: 11,
        company_id: 1,
        packet_id: 20,
        item_id: 31,
        quantity: 5,
        company: companiesStore[0],
        packet: { id: 20, name: 'Paket Dasar' },
        item: {
          id: 31,
          company_id: 1,
          code: 'ITM-002',
          name: 'Lakban Bening',
          type: 'Peralatan',
        },
      },
      {
        id: 12,
        company_id: 2,
        packet_id: 20,
        item_id: 32,
        quantity: 1,
        company: companiesStore[1],
        packet: { id: 20, name: 'Paket Dasar' },
        item: {
          id: 32,
          company_id: 2,
          code: 'ITM-003',
          name: 'Plastik Segel',
          type: 'Bahan',
        },
      },
    ];
    let defaultPackagesStore: apiClient.DefaultPackage[] = [
      {
        id: 50,
        brand_name: 'Brand Awal',
        packet_name_id: 1,
        packet_vendor_id: 1,
        packet_category_id: 1,
        item_packet_id: 11,
        price: 120000,
        packet_name: packetNamesStore[0],
        packet_vendor: packetVendorsStore[0],
        packet_category: packetCategoriesStore[0],
        item_packet: itemPacketsStore[1],
      },
    ];

    vi.mocked(apiClient.fetchPacketNames).mockImplementation(async () => ({
      data: [...packetNamesStore],
      meta: { count: packetNamesStore.length },
    }));
    vi.mocked(apiClient.createPacketName).mockImplementation(async (payload) => {
      const created: apiClient.PacketName = { id: 2, name: payload.name };
      packetNamesStore = [created, ...packetNamesStore];
      return { data: created };
    });
    vi.mocked(apiClient.updatePacketName).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.PacketName = { id, name: payload.name };
        packetNamesStore = packetNamesStore.map((row) =>
          row.id === id ? updated : row
        );
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deletePacketName).mockImplementation(async (id) => {
      packetNamesStore = packetNamesStore.filter((row) => row.id !== id);
      return { message: 'Packet name deleted successfully.' };
    });

    vi.mocked(apiClient.fetchPacketVendors).mockImplementation(async () => ({
      data: [...packetVendorsStore],
      meta: { count: packetVendorsStore.length },
    }));
    vi.mocked(apiClient.createPacketVendor).mockImplementation(
      async (payload) => {
        const created: apiClient.PacketVendor = {
          id: 2,
          name: payload.name,
          type: payload.type ?? 'Bahan',
        };
        packetVendorsStore = [created, ...packetVendorsStore];
        return { data: created };
      }
    );
    vi.mocked(apiClient.updatePacketVendor).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.PacketVendor = {
          id,
          name: payload.name,
          type: payload.type ?? 'Bahan',
        };
        packetVendorsStore = packetVendorsStore.map((row) =>
          row.id === id ? updated : row
        );
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deletePacketVendor).mockImplementation(async (id) => {
      packetVendorsStore = packetVendorsStore.filter((row) => row.id !== id);
      return { message: 'Packet vendor deleted successfully.' };
    });

    vi.mocked(apiClient.fetchPacketCategories).mockImplementation(async () => ({
      data: [...packetCategoriesStore],
      meta: { count: packetCategoriesStore.length },
    }));
    vi.mocked(apiClient.createPacketCategory).mockImplementation(
      async (payload) => {
        const created: apiClient.PacketCategory = {
          id: 2,
          name: payload.name,
        };
        packetCategoriesStore = [created, ...packetCategoriesStore];
        return { data: created };
      }
    );
    vi.mocked(apiClient.updatePacketCategory).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.PacketCategory = { id, name: payload.name };
        packetCategoriesStore = packetCategoriesStore.map((row) =>
          row.id === id ? updated : row
        );
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deletePacketCategory).mockImplementation(async (id) => {
      packetCategoriesStore = packetCategoriesStore.filter(
        (row) => row.id !== id
      );
      return { message: 'Packet category deleted successfully.' };
    });

    vi.mocked(apiClient.fetchItemPackets).mockImplementation(async () => ({
      data: [...itemPacketsStore],
      meta: { count: itemPacketsStore.length },
    }));

    vi.mocked(apiClient.fetchDefaultPackages).mockImplementation(async () => ({
      data: [...defaultPackagesStore],
      meta: { count: defaultPackagesStore.length },
    }));
    vi.mocked(apiClient.createDefaultPackage).mockImplementation(
      async (payload) => {
        const created: apiClient.DefaultPackage = {
          id: 51,
          brand_name: payload.brand_name,
          packet_name_id: payload.packet_name_id,
          packet_vendor_id: payload.packet_vendor_id,
          packet_category_id: payload.packet_category_id,
          item_packet_id: payload.item_packet_id,
          price: payload.price ?? 0,
          packet_name:
            packetNamesStore.find((p) => p.id === payload.packet_name_id) ??
            null,
          packet_vendor:
            packetVendorsStore.find((v) => v.id === payload.packet_vendor_id) ??
            null,
          packet_category:
            packetCategoriesStore.find(
              (c) => c.id === payload.packet_category_id
            ) ?? null,
          item_packet:
            itemPacketsStore.find((ip) => ip.id === payload.item_packet_id) ??
            null,
        };
        defaultPackagesStore = [created, ...defaultPackagesStore];
        return { data: created };
      }
    );
    vi.mocked(apiClient.updateDefaultPackage).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.DefaultPackage = {
          id,
          brand_name: payload.brand_name,
          packet_name_id: payload.packet_name_id,
          packet_vendor_id: payload.packet_vendor_id,
          packet_category_id: payload.packet_category_id,
          item_packet_id: payload.item_packet_id,
          price: payload.price ?? 0,
          packet_name:
            packetNamesStore.find((p) => p.id === payload.packet_name_id) ??
            null,
          packet_vendor:
            packetVendorsStore.find((v) => v.id === payload.packet_vendor_id) ??
            null,
          packet_category:
            packetCategoriesStore.find(
              (c) => c.id === payload.packet_category_id
            ) ?? null,
          item_packet:
            itemPacketsStore.find((ip) => ip.id === payload.item_packet_id) ??
            null,
        };
        defaultPackagesStore = defaultPackagesStore.map((row) =>
          row.id === id ? updated : row
        );
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deleteDefaultPackage).mockImplementation(async (id) => {
      defaultPackagesStore = defaultPackagesStore.filter(
        (row) => row.id !== id
      );
      return { message: 'Default package deleted successfully.' };
    });

    renderApp();

    // 1. Select company & open CPO module
    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    const inputPaketCard = within(cpoMenu).getByTestId(
      'horizontal-menu-card-INPUT_PAKET'
    );
    expect(inputPaketCard).toHaveTextContent('Input Paket');
    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_PAKET')
    ).not.toBeInTheDocument();

    // 2. Click Input Paket -> shows Master Paket, Master Bahan Baku, and View Bahan Baku child cards
    fireEvent.click(inputPaketCard);
    const paketSubmenu = screen.getByTestId('horizontal-submenu-INPUT_PAKET');
    const masterPaketCard = within(paketSubmenu).getByTestId(
      'horizontal-menu-card-MASTER_PAKET'
    );
    const masterBahanBakuCard = within(paketSubmenu).getByTestId(
      'horizontal-menu-card-MASTER_BAHAN_BAKU'
    );
    const viewBahanBakuCard = within(paketSubmenu).getByTestId(
      'horizontal-menu-card-VIEW_BAHAN_BAKU'
    );
    expect(masterPaketCard).toHaveTextContent('Master Paket');
    expect(masterBahanBakuCard).toHaveTextContent('Master Bahan Baku');
    expect(viewBahanBakuCard).toHaveTextContent('View Bahan Baku');

    // 3. Click Master Paket -> shows Master Paket modal with Master Karyawan split style
    fireEvent.click(masterPaketCard);
    const modal = await screen.findByTestId('master-paket-crud-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');

    const tabVendor = screen.getByTestId('master-paket-tab-vendor');
    const tabDefaultPackage = screen.getByTestId(
      'master-paket-tab-default-package'
    );
    expect(tabVendor).toHaveTextContent('Vendor');
    expect(tabDefaultPackage).toHaveTextContent('Paket Awal');
    expect(tabVendor).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.queryByTestId('master-paket-tab-paket')
    ).not.toBeInTheDocument();

    const splitLayout = screen.getByTestId('master-paket-crud-modal-split-layout');
    const formPanel = screen.getByTestId('master-paket-crud-modal-form-panel');
    const tablePanel = screen.getByTestId('master-paket-crud-modal-table-panel');
    const formEl = screen.getByTestId('master-paket-crud-modal-form');
    expect(splitLayout).toContainElement(formPanel);
    expect(splitLayout).toContainElement(tablePanel);
    expect(formPanel).toContainElement(formEl);
    expect(formEl).toHaveClass('flex-col');
    expect(
      screen.getByTestId('master-paket-crud-modal-name-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');
    expect(tablePanel).toContainElement(
      screen.getByTestId('master-paket-crud-modal-pagination')
    );

    // Seeded PacketVendor row visible on the "Vendor" tab
    expect(
      await within(tablePanel).findByText('Vendor Nusantara')
    ).toBeInTheDocument();

    const vendorNameInput = within(formPanel).getByLabelText(
      'Nama Vendor'
    ) as HTMLInputElement;
    const vendorTypeSelect = within(formPanel).getByLabelText(
      'Tipe Vendor'
    ) as HTMLSelectElement;

    // Create PacketVendor with name and type
    fireEvent.change(vendorNameInput, { target: { value: 'Vendor Sentosa' } });
    fireEvent.change(vendorTypeSelect, { target: { value: 'Kelengkapan' } });
    fireEvent.click(within(formPanel).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createPacketVendor).toHaveBeenCalledWith({
        name: 'Vendor Sentosa',
        type: 'Kelengkapan',
      });
      expect(
        within(tablePanel).getByText('Vendor Sentosa')
      ).toBeInTheDocument();
      expect(within(tablePanel).getByText('Kelengkapan')).toBeInTheDocument();
    });

    // Edit PacketVendor row 2
    fireEvent.click(within(tablePanel).getByTestId('edit-row-2'));
    expect(vendorNameInput.value).toBe('Vendor Sentosa');
    expect(vendorTypeSelect.value).toBe('Kelengkapan');

    fireEvent.change(vendorNameInput, {
      target: { value: 'Vendor Sentosa Jaya' },
    });
    fireEvent.change(vendorTypeSelect, {
      target: { value: 'Sarpras' },
    });
    fireEvent.click(within(formPanel).getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updatePacketVendor).toHaveBeenCalledWith(2, {
        name: 'Vendor Sentosa Jaya',
        type: 'Sarpras',
      });
      expect(
        within(tablePanel).getByText('Vendor Sentosa Jaya')
      ).toBeInTheDocument();
      expect(within(tablePanel).getByText('Sarpras')).toBeInTheDocument();
    });

    // Delete PacketVendor row 2
    fireEvent.click(within(tablePanel).getByTestId('delete-row-2'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deletePacketVendor).toHaveBeenCalledWith(2);
      expect(
        within(tablePanel).queryByText('Vendor Sentosa Jaya')
      ).not.toBeInTheDocument();
    });

    // Tab 2: Paket Awal (DefaultPackage CRUD)
    fireEvent.click(tabDefaultPackage);
    expect(
      screen.getByTestId('master-paket-tab-default-package')
    ).toHaveAttribute('aria-selected', 'true');

    const defaultModal = await screen.findByTestId('master-paket-crud-modal');
    expect(
      screen.getByTestId('master-paket-crud-modal-split-layout')
    ).toContainElement(screen.getByTestId('master-paket-crud-modal-form-panel'));
    expect(
      screen.getByTestId('master-paket-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-paket-crud-modal-table-panel')
    );
    expect(
      screen.getByTestId('master-paket-crud-modal-brand_name-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');

    expect(
      await within(defaultModal).findByText('Brand Awal')
    ).toBeInTheDocument();
    expect(within(defaultModal).getByText('Rp 120.000')).toBeInTheDocument();

    // Datatable displays only Company Name and Packet Name in Item Paket column
    const defaultTablePanel = screen.getByTestId(
      'master-paket-crud-modal-table-panel'
    );
    expect(
      within(defaultTablePanel).getByText('PT. Slaras Nusa Foodlab — Paket Dasar')
    ).toBeInTheDocument();
    expect(
      within(defaultTablePanel).queryByText(/Kardus Packing|Lakban Bening/)
    ).not.toBeInTheDocument();

    // Dropdown has only unique (company_id, packet_id) options displaying Company Name — Packet Name
    const itemPacketSelect = within(defaultModal).getByLabelText(
      'Item Paket'
    ) as HTMLSelectElement;
    const itemPacketOptionLabels = Array.from(itemPacketSelect.options).map(
      (opt) => opt.textContent
    );
    expect(itemPacketOptionLabels).toEqual([
      'Pilih item paket...',
      'PT. Slaras Nusa Foodlab — Paket Dasar',
      'PT. Pangan Nusantara — Paket Dasar',
    ]);

    // Editing row 50 (item_packet_id = 11, second item in company 1 + packet 20) still selects the group cleanly
    fireEvent.click(within(defaultModal).getByTestId('edit-row-50'));
    expect(itemPacketSelect.value).toBe('11');
    expect(itemPacketSelect.options).toHaveLength(3);
    fireEvent.click(within(defaultModal).getByRole('button', { name: 'Batal' }));

    fireEvent.change(within(defaultModal).getByLabelText('Nama Brand'), {
      target: { value: 'Brand Nusantara' },
    });
    fireEvent.change(within(defaultModal).getByLabelText('Nama Paket'), {
      target: { value: '1' },
    });
    fireEvent.change(within(defaultModal).getByLabelText('Vendor Paket'), {
      target: { value: '1' },
    });
    fireEvent.change(within(defaultModal).getByLabelText('Kategori Paket'), {
      target: { value: '1' },
    });
    fireEvent.change(within(defaultModal).getByLabelText('Item Paket'), {
      target: { value: '10' },
    });
    fireEvent.change(within(defaultModal).getByLabelText('Harga (Rp)'), {
      target: { value: '250000' },
    });
    fireEvent.click(
      within(defaultModal).getByRole('button', { name: 'Tambah' })
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createDefaultPackage).toHaveBeenCalledWith({
        brand_name: 'Brand Nusantara',
        packet_name_id: 1,
        packet_vendor_id: 1,
        packet_category_id: 1,
        item_packet_id: 10,
        price: 250000,
      });
      expect(
        within(defaultModal).getByText('Brand Nusantara')
      ).toBeInTheDocument();
      expect(within(defaultModal).getByText('Rp 250.000')).toBeInTheDocument();
    });

    fireEvent.click(within(defaultModal).getByTestId('edit-row-51'));
    fireEvent.change(within(defaultModal).getByLabelText('Nama Brand'), {
      target: { value: 'Brand Nusantara Pro' },
    });
    fireEvent.change(within(defaultModal).getByLabelText('Harga (Rp)'), {
      target: { value: '300000' },
    });
    fireEvent.click(
      within(defaultModal).getByRole('button', { name: 'Perbarui' })
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateDefaultPackage).toHaveBeenCalledWith(51, {
        brand_name: 'Brand Nusantara Pro',
        packet_name_id: 1,
        packet_vendor_id: 1,
        packet_category_id: 1,
        item_packet_id: 10,
        price: 300000,
      });
      expect(
        within(defaultModal).getByText('Brand Nusantara Pro')
      ).toBeInTheDocument();
      expect(within(defaultModal).getByText('Rp 300.000')).toBeInTheDocument();
    });

    fireEvent.click(within(defaultModal).getByTestId('delete-row-51'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteDefaultPackage).toHaveBeenCalledWith(51);
      expect(
        within(defaultModal).queryByText('Brand Nusantara Pro')
      ).not.toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(
      within(defaultModal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('master-paket-crud-modal')
    ).not.toBeInTheDocument();
  });

  it('shows Input Paket -> Master Bahan Baku modal, displays all Bahan and Kelengkapan items across companies with company.name, supports dynamic + rows and full CRUD', async () => {
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
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
      { id: 2, name: 'PT. Pangan Nusantara', series: 1 },
      { id: 3, name: 'PT. Kuliner Mandiri', series: 1 },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (id) => ({
      data: companiesStore.find((c) => c.id === id) ?? null,
    }));

    const itemsStore: apiClient.Item[] = [
      {
        id: 101,
        company_id: 1,
        code: 'BHN-01',
        name: 'Tepung Terigu',
        type: 'Bahan',
      },
      {
        id: 102,
        company_id: 1,
        code: 'BHN-02',
        name: 'Gula Pasir',
        type: 'Bahan',
      },
      {
        id: 104,
        company_id: 1,
        code: 'BHN-03',
        name: 'Mentega',
        type: 'Bahan',
      },
      {
        id: 103,
        company_id: 1,
        code: 'SRP-01',
        name: 'Booth Gerobak',
        type: 'Sarpras',
      },
      {
        id: 201,
        company_id: 2,
        code: 'BHN-201',
        name: 'Susu Bubuk Cabang 2',
        type: 'Bahan',
      },
      {
        id: 202,
        company_id: 2,
        code: 'BHN-202',
        name: 'Coklat Bubuk Cabang 2',
        type: 'Bahan',
      },
      {
        id: 105,
        company_id: 3,
        code: 'KLP-01',
        name: 'Cup Sealer',
        type: 'Kelengkapan',
      },
    ];

    const itemPacketsStore: apiClient.ItemPacket[] = [
      {
        id: 10,
        company_id: 1,
        packet_id: 20,
        item_id: 103,
        quantity: 1,
        company: companiesStore[0],
        packet: { id: 20, name: 'Paket Dasar' },
        item: itemsStore[3],
      },
      {
        id: 11,
        company_id: 2,
        packet_id: 21,
        item_id: 201,
        quantity: 1,
        company: companiesStore[1],
        packet: { id: 21, name: 'Paket Cabang 2' },
        item: itemsStore[4],
      },
      {
        id: 12,
        company_id: 3,
        packet_id: 22,
        item_id: 201,
        quantity: 1,
        company: companiesStore[2],
        packet: { id: 22, name: 'Paket Kosong' },
        item: null,
      },
    ];

    const defaultPackagesStore: apiClient.DefaultPackage[] = [
      {
        id: 50,
        brand_name: 'Brand Satu',
        packet_name_id: 1,
        packet_vendor_id: 1,
        packet_category_id: 1,
        item_packet_id: 10,
        price: 100000,
        packet_name: { id: 1, name: 'Paket Starter' },
        item_packet: itemPacketsStore[0],
      },
      {
        id: 51,
        brand_name: 'Brand Dua',
        packet_name_id: 1,
        packet_vendor_id: 1,
        packet_category_id: 1,
        item_packet_id: 11,
        price: 150000,
        packet_name: { id: 1, name: 'Paket Cabang' },
        item_packet: itemPacketsStore[1],
      },
      {
        id: 52,
        brand_name: 'Brand Tiga',
        packet_name_id: 1,
        packet_vendor_id: 1,
        packet_category_id: 1,
        item_packet_id: 12,
        price: 175000,
        packet_name: { id: 1, name: 'Paket Kosong' },
        item_packet: itemPacketsStore[2],
      },
    ];

    let ingredientsStore: apiClient.Ingredient[] = [
      {
        id: 300,
        default_package_id: 51,
        item_id: 201,
        price: 15000,
        default_package: defaultPackagesStore[1],
        item: itemsStore[4],
      },
      {
        id: 301,
        default_package_id: 51,
        item_id: 202,
        price: 25000,
        default_package: defaultPackagesStore[1],
        item: itemsStore[5],
      },
    ];
    let nextIngredientId = 302;

    vi.mocked(apiClient.fetchItems).mockImplementation(async () => ({
      data: [...itemsStore],
      meta: { count: itemsStore.length },
    }));
    vi.mocked(apiClient.fetchItemPackets).mockImplementation(async () => ({
      data: [...itemPacketsStore],
      meta: { count: itemPacketsStore.length },
    }));
    vi.mocked(apiClient.fetchDefaultPackages).mockImplementation(async () => ({
      data: [...defaultPackagesStore],
      meta: { count: defaultPackagesStore.length },
    }));
    vi.mocked(apiClient.fetchIngredients).mockImplementation(async () => ({
      data: [...ingredientsStore],
      meta: { count: ingredientsStore.length },
    }));
    vi.mocked(apiClient.createIngredient).mockImplementation(
      async (payload) => {
        const created: apiClient.Ingredient = {
          id: nextIngredientId++,
          default_package_id: payload.default_package_id,
          item_id: payload.item_id,
          price: payload.price ?? 0,
          default_package:
            defaultPackagesStore.find(
              (dp) => dp.id === payload.default_package_id
            ) ?? null,
          item: itemsStore.find((it) => it.id === payload.item_id) ?? null,
        };
        ingredientsStore = [created, ...ingredientsStore];
        return { data: created };
      }
    );
    vi.mocked(apiClient.updateIngredient).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.Ingredient = {
          id,
          default_package_id: payload.default_package_id,
          item_id: payload.item_id,
          price: payload.price ?? 0,
          default_package:
            defaultPackagesStore.find(
              (dp) => dp.id === payload.default_package_id
            ) ?? null,
          item: itemsStore.find((it) => it.id === payload.item_id) ?? null,
        };
        ingredientsStore = ingredientsStore.map((row) =>
          row.id === id ? updated : row
        );
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deleteIngredient).mockImplementation(async (id) => {
      ingredientsStore = ingredientsStore.filter((row) => row.id !== id);
      return { message: 'Ingredient deleted successfully.' };
    });

    renderApp();

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));
    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    fireEvent.click(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_PAKET')
    );

    const paketSubmenu = screen.getByTestId('horizontal-submenu-INPUT_PAKET');
    fireEvent.click(
      within(paketSubmenu).getByTestId('horizontal-menu-card-MASTER_BAHAN_BAKU')
    );

    const modal = await screen.findByTestId('master-bahan-baku-crud-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('master-bahan-baku-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-bahan-baku-crud-modal-form-panel')
    );
    expect(
      screen.getByTestId('master-bahan-baku-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-bahan-baku-crud-modal-table-panel')
    );

    // Existing Brand Dua ingredients are grouped into one row with comma concatenation & summed price
    expect(
      await within(modal).findByText(
        'Susu Bubuk Cabang 2 (BHN-201), Coklat Bubuk Cabang 2 (BHN-202)'
      )
    ).toBeInTheDocument();
    expect(within(modal).getByText('Rp 40.000')).toBeInTheDocument();

    // Select Nama Brand (company 1) -> shows all Bahan and Kelengkapan items across all companies with company.name (excluding Sarpras)
    const brandSelect = within(modal).getByLabelText(
      'Nama Brand'
    ) as HTMLSelectElement;
    fireEvent.change(brandSelect, { target: { value: '50' } });

    const row0 = within(modal).getByTestId('ingredient-item-row-0');
    const row0Select = within(row0).getByLabelText(
      'Bahan Baku'
    ) as HTMLSelectElement;
    const row0OptionLabels = Array.from(row0Select.options).map(
      (opt) => opt.textContent
    );
    expect(row0OptionLabels).toContain(
      'Tepung Terigu (BHN-01) - PT. Slaras Nusa Foodlab'
    );
    expect(row0OptionLabels).toContain(
      'Gula Pasir (BHN-02) - PT. Slaras Nusa Foodlab'
    );
    expect(row0OptionLabels).toContain(
      'Mentega (BHN-03) - PT. Slaras Nusa Foodlab'
    );
    expect(row0OptionLabels).toContain(
      'Cup Sealer (KLP-01) - PT. Kuliner Mandiri'
    );
    expect(row0OptionLabels).toContain(
      'Susu Bubuk Cabang 2 (BHN-201) - PT. Pangan Nusantara'
    );
    expect(row0OptionLabels).not.toContain(
      'Booth Gerobak (SRP-01) - PT. Slaras Nusa Foodlab'
    );

    // Switching brand keeps non-persisted items from any company, while clearing items already persisted on the target brand
    fireEvent.change(row0Select, { target: { value: '101' } });
    fireEvent.change(brandSelect, { target: { value: '51' } });
    expect(row0Select.value).toBe('101');
    fireEvent.change(brandSelect, { target: { value: '50' } });
    fireEvent.change(row0Select, { target: { value: '201' } });
    expect(row0Select.value).toBe('201');
    fireEvent.change(brandSelect, { target: { value: '51' } });
    expect(row0Select.value).toBe('');

    // Switch back to Brand Satu (company 1), fill row 0 and click "+" to add row 1 dynamically
    fireEvent.change(brandSelect, { target: { value: '50' } });
    fireEvent.change(row0Select, { target: { value: '101' } });
    fireEvent.change(within(row0).getByLabelText('Harga (Rp)'), {
      target: { value: '12000' },
    });

    const plusBtn = within(modal).getByRole('button', { name: '+' });
    fireEvent.click(plusBtn);

    const row1 = within(modal).getByTestId('ingredient-item-row-1');
    const row1Select = within(row1).getByLabelText(
      'Bahan Baku'
    ) as HTMLSelectElement;
    // Row 1 excludes item already picked in row 0
    const row1OptionLabels = Array.from(row1Select.options).map(
      (opt) => opt.textContent
    );
    expect(row1OptionLabels).toContain(
      'Gula Pasir (BHN-02) - PT. Slaras Nusa Foodlab'
    );
    expect(row1OptionLabels).not.toContain(
      'Tepung Terigu (BHN-01) - PT. Slaras Nusa Foodlab'
    );

    fireEvent.change(row1Select, { target: { value: '102' } });
    fireEvent.change(within(row1).getByLabelText('Harga (Rp)'), {
      target: { value: '18500' },
    });

    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createIngredient).toHaveBeenCalledTimes(2);
      expect(apiClient.createIngredient).toHaveBeenNthCalledWith(1, {
        default_package_id: 50,
        item_id: 101,
        price: 12000,
      });
      expect(apiClient.createIngredient).toHaveBeenNthCalledWith(2, {
        default_package_id: 50,
        item_id: 102,
        price: 18500,
      });
      expect(
        within(modal).getByText('Tepung Terigu (BHN-01), Gula Pasir (BHN-02)')
      ).toBeInTheDocument();
      expect(within(modal).getByText('Rp 30.500')).toBeInTheDocument();
    });

    // Edit grouped row for Brand Satu (50): update price on row 0 AND click "+" to add Mentega dynamically
    fireEvent.click(within(modal).getByTestId('edit-row-50'));
    const editRow0 = within(modal).getByTestId('ingredient-item-row-0');
    fireEvent.change(within(editRow0).getByLabelText('Harga (Rp)'), {
      target: { value: '15000' },
    });

    fireEvent.click(within(modal).getByRole('button', { name: '+' }));
    const editRow2 = within(modal).getByTestId('ingredient-item-row-2');
    fireEvent.change(within(editRow2).getByLabelText('Bahan Baku'), {
      target: { value: '104' },
    });
    fireEvent.change(within(editRow2).getByLabelText('Harga (Rp)'), {
      target: { value: '5000' },
    });

    fireEvent.click(within(modal).getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateIngredient).toHaveBeenCalledWith(302, {
        default_package_id: 50,
        item_id: 101,
        price: 15000,
      });
      expect(apiClient.createIngredient).toHaveBeenCalledWith({
        default_package_id: 50,
        item_id: 104,
        price: 5000,
      });
      expect(
        within(modal).getByText(
          'Tepung Terigu (BHN-01), Gula Pasir (BHN-02), Mentega (BHN-03)'
        )
      ).toBeInTheDocument();
      expect(within(modal).getByText('Rp 38.500')).toBeInTheDocument();
    });

    // Delete grouped row for Brand Satu (50) -> deletes all ingredients in that brand group
    fireEvent.click(within(modal).getByTestId('delete-row-50'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteIngredient).toHaveBeenCalledTimes(3);
      expect(
        within(modal).queryByText(
          'Tepung Terigu (BHN-01), Gula Pasir (BHN-02), Mentega (BHN-03)'
        )
      ).not.toBeInTheDocument();
    });

    fireEvent.click(
      within(modal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('master-bahan-baku-crud-modal')
    ).not.toBeInTheDocument();
  });

  it('shows Input Paket -> View Bahan Baku strictly read-only datatable grouped by default_package_id with Detail inspection modal', async () => {
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
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
      { id: 2, name: 'PT. Pangan Nusantara', series: 1 },
      { id: 3, name: 'PT. Kuliner Mandiri', series: 1 },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (id) => ({
      data: companiesStore.find((c) => c.id === id) ?? null,
    }));

    const itemsStore: apiClient.Item[] = [
      {
        id: 101,
        company_id: 1,
        code: 'BHN-01',
        name: 'Tepung Terigu',
        type: 'Bahan',
      },
      {
        id: 102,
        company_id: 1,
        code: 'BHN-02',
        name: 'Gula Pasir',
        type: 'Bahan',
      },
      {
        id: 104,
        company_id: 1,
        code: null,
        name: 'Garam Halus',
        type: 'Bahan',
      },
    ];

    const defaultPackagesStore: apiClient.DefaultPackage[] = [
      {
        id: 50,
        brand_name: 'Brand Satu',
        packet_name_id: 1,
        packet_vendor_id: 1,
        packet_category_id: 1,
        item_packet_id: 10,
        price: 100000,
        packet_name: { id: 1, name: 'Paket Starter' },
        packet_vendor: { id: 1, name: 'Vendor Utama' },
        packet_category: { id: 1, name: 'Kategori Reguler' },
      },
      {
        id: 51,
        brand_name: 'Brand Dua',
        packet_name_id: 2,
        packet_vendor_id: 1,
        packet_category_id: 2,
        item_packet_id: 10,
        price: 150000,
        packet_name: { id: 2, name: 'Paket Pro' },
        packet_vendor: { id: 1, name: 'Vendor Utama' },
        packet_category: { id: 2, name: 'Kategori Premium' },
      },
    ];

    const ingredientsStore: apiClient.Ingredient[] = [
      {
        id: 300,
        default_package_id: 50,
        item_id: 101,
        price: 12000,
        default_package: defaultPackagesStore[0],
        item: itemsStore[0],
      },
      {
        id: 301,
        default_package_id: 50,
        item_id: 102,
        price: 18500,
        default_package: defaultPackagesStore[0],
        item: itemsStore[1],
      },
      {
        id: 302,
        default_package_id: 51,
        item_id: 104,
        price: 5000,
        default_package: defaultPackagesStore[1],
        item: itemsStore[2],
      },
    ];

    vi.mocked(apiClient.fetchItems).mockResolvedValue({
      data: itemsStore,
      meta: { count: itemsStore.length },
    });
    vi.mocked(apiClient.fetchItemPackets).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchDefaultPackages).mockResolvedValue({
      data: defaultPackagesStore,
      meta: { count: defaultPackagesStore.length },
    });
    vi.mocked(apiClient.fetchIngredients).mockResolvedValue({
      data: ingredientsStore,
      meta: { count: ingredientsStore.length },
    });

    renderApp();

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));
    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    fireEvent.click(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_PAKET')
    );

    const paketSubmenu = screen.getByTestId('horizontal-submenu-INPUT_PAKET');
    fireEvent.click(
      within(paketSubmenu).getByTestId('horizontal-menu-card-VIEW_BAHAN_BAKU')
    );

    const viewModal = await screen.findByTestId('view-bahan-baku-modal');
    expect(viewModal).toBeInTheDocument();

    // Strictly read-only: no form panel, no Tambah/Edit/Hapus buttons
    expect(
      screen.queryByTestId('view-bahan-baku-modal-form-panel')
    ).not.toBeInTheDocument();
    expect(
      within(viewModal).queryByRole('button', { name: 'Tambah' })
    ).not.toBeInTheDocument();
    expect(
      within(viewModal).queryByRole('button', { name: 'Edit' })
    ).not.toBeInTheDocument();
    expect(
      within(viewModal).queryByRole('button', { name: 'Hapus' })
    ).not.toBeInTheDocument();

    // Grouped rows & total summary banner
    expect(
      await within(viewModal).findByText(
        'Tepung Terigu (BHN-01), Gula Pasir (BHN-02)'
      )
    ).toBeInTheDocument();
    expect(within(viewModal).getByText('Rp 30.500')).toBeInTheDocument();
    expect(within(viewModal).getByText('2 item')).toBeInTheDocument();
    expect(within(viewModal).getByText('Garam Halus')).toBeInTheDocument();
    expect(within(viewModal).getByText('Rp 5.000')).toBeInTheDocument();
    expect(
      screen.getByTestId('view-bahan-baku-total-banner-value')
    ).toHaveTextContent('Rp 35.500');

    // Click Detail button on Brand Satu (50)
    fireEvent.click(within(viewModal).getByTestId('detail-bahan-baku-row-50'));

    const detailModal = await screen.findByTestId(
      'view-bahan-baku-detail-modal'
    );
    expect(detailModal).toBeInTheDocument();
    expect(
      within(detailModal).getByRole('heading', { name: 'Brand Satu' })
    ).toBeInTheDocument();
    expect(within(detailModal).getByText('Vendor Utama')).toBeInTheDocument();
    expect(
      within(detailModal).getByText('Kategori Reguler')
    ).toBeInTheDocument();
    expect(within(detailModal).getByText('Rp 100.000')).toBeInTheDocument();
    expect(
      screen.getByTestId('view-bahan-baku-detail-total-banner-value')
    ).toHaveTextContent('Rp 30.500');

    // Individual Ingredient rows in Detail modal
    expect(within(detailModal).getByText('BHN-01')).toBeInTheDocument();
    expect(within(detailModal).getByText('Tepung Terigu')).toBeInTheDocument();
    expect(within(detailModal).getByText('Rp 12.000')).toBeInTheDocument();
    expect(within(detailModal).getByText('BHN-02')).toBeInTheDocument();
    expect(within(detailModal).getByText('Gula Pasir')).toBeInTheDocument();
    expect(within(detailModal).getByText('Rp 18.500')).toBeInTheDocument();

    // Close detail modal and main view modal
    fireEvent.click(
      within(detailModal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('view-bahan-baku-detail-modal')
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(viewModal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('view-bahan-baku-modal')
    ).not.toBeInTheDocument();
  });
});
