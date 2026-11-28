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
    let itemPacketsStore: apiClient.ItemPacket[] = [
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

    let ingredientsStore: apiClient.Ingredient[] = [];
    vi.mocked(apiClient.fetchIngredients).mockImplementation(async () => ({
      data: [...ingredientsStore],
      meta: { count: ingredientsStore.length },
    }));

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

    const itemsCatalogStore: apiClient.Item[] = [
      {
        id: 30,
        company_id: 1,
        packet_vendor_id: null,
        code: 'ITM-001',
        name: 'Kardus Packing',
        type: 'Bahan',
        company: companiesStore[0],
      },
      {
        id: 31,
        company_id: 1,
        packet_vendor_id: null,
        code: 'ITM-002',
        name: 'Lakban Bening',
        type: 'Kelengkapan',
        company: companiesStore[0],
      },
      {
        id: 32,
        company_id: 2,
        packet_vendor_id: null,
        code: 'ITM-003',
        name: 'Plastik Segel',
        type: 'Bahan',
        company: companiesStore[1],
      },
      {
        id: 33,
        company_id: null,
        packet_vendor_id: 1,
        code: 'VND-001',
        name: 'Kopi Robusta Vendor',
        type: 'Bahan',
        packet_vendor: packetVendorsStore[0],
      },
    ];

    vi.mocked(apiClient.fetchItems).mockResolvedValue({
      data: [...itemsCatalogStore],
      meta: { count: itemsCatalogStore.length },
    });

    vi.mocked(apiClient.fetchItemPackets).mockImplementation(async () => ({
      data: [...itemPacketsStore],
      meta: { count: itemPacketsStore.length },
    }));

    vi.mocked(apiClient.fetchDefaultPackages).mockImplementation(async () => ({
      data: [...defaultPackagesStore],
      meta: { count: defaultPackagesStore.length },
    }));

    vi.mocked(apiClient.createDefaultPackageWizard).mockImplementation(
      async (payload) => {
        const totalPrice = payload.price;
        const createdItemPackets: apiClient.ItemPacket[] = payload.items.map(
          (row, idx) => {
            const matchedItem = itemsCatalogStore.find(
              (item) => item.id === row.item_id
            );
            return {
              id: 100 + idx,
              company_id: payload.company_id ?? null,
              packet_vendor_id: payload.packet_vendor_id ?? null,
              packet_id: 25,
              item_id: row.item_id,
              quantity: row.quantity,
              company:
                companiesStore.find((c) => c.id === payload.company_id) ?? null,
              packet_vendor:
                packetVendorsStore.find(
                  (v) => v.id === payload.packet_vendor_id
                ) ?? null,
              packet: { id: 25, name: payload.packet_name },
              item: matchedItem
                ? {
                    id: matchedItem.id,
                    company_id: matchedItem.company_id,
                    packet_vendor_id: matchedItem.packet_vendor_id,
                    code: matchedItem.code,
                    name: matchedItem.name,
                    type: matchedItem.type,
                  }
                : null,
            };
          }
        );
        itemPacketsStore = [...itemPacketsStore, ...createdItemPackets];

        const matchedName =
          packetNamesStore.find(
            (n) =>
              n.name.trim().toLowerCase() ===
              payload.packet_name.trim().toLowerCase()
          ) ??
          (() => {
            const added = {
              id: packetNamesStore.length + 10,
              name: payload.packet_name,
            };
            packetNamesStore = [...packetNamesStore, added];
            return added;
          })();
        const matchedCat =
          packetCategoriesStore.find(
            (c) =>
              c.name.trim().toLowerCase() ===
              payload.packet_category.trim().toLowerCase()
          ) ??
          (() => {
            const added = {
              id: packetCategoriesStore.length + 10,
              name: payload.packet_category,
            };
            packetCategoriesStore = [...packetCategoriesStore, added];
            return added;
          })();

        const created: apiClient.DefaultPackage = {
          id: 51,
          brand_name: payload.brand_name,
          packet_name_id: matchedName.id,
          company_id: payload.company_id ?? null,
          packet_vendor_id: payload.packet_vendor_id ?? null,
          packet_category_id: matchedCat.id,
          packet_id: 25,
          item_packet_id: createdItemPackets[0]?.id ?? 10,
          price: totalPrice,
          packet_name: matchedName,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
          packet_vendor:
            packetVendorsStore.find((v) => v.id === payload.packet_vendor_id) ??
            null,
          packet_category: matchedCat,
          item_packet: createdItemPackets[0] ?? itemPacketsStore[0],
        };
        defaultPackagesStore = [created, ...defaultPackagesStore];
        ingredientsStore = [
          ...ingredientsStore,
          ...payload.items.map((row, idx) => ({
            id: 500 + idx,
            default_package_id: created.id,
            item_id: row.item_id,
            price: row.price ?? 0,
            default_package: created,
            item:
              itemsCatalogStore.find((item) => item.id === row.item_id) ?? null,
          })),
        ];
        return { data: created };
      }
    );

    vi.mocked(apiClient.updateDefaultPackageWizard).mockImplementation(
      async (id, payload) => {
        const totalPrice = payload.price;
        const existing = defaultPackagesStore.find((dp) => dp.id === id);
        const packetId = existing?.packet_id ?? 20;

        const updatedItemPackets: apiClient.ItemPacket[] = payload.items.map(
          (row, idx) => {
            const matchedItem = itemsCatalogStore.find(
              (item) => item.id === row.item_id
            );
            return {
              id: 200 + idx,
              company_id: payload.company_id ?? null,
              packet_vendor_id: payload.packet_vendor_id ?? null,
              packet_id: packetId,
              item_id: row.item_id,
              quantity: row.quantity,
              company:
                companiesStore.find((c) => c.id === payload.company_id) ?? null,
              packet_vendor:
                packetVendorsStore.find(
                  (v) => v.id === payload.packet_vendor_id
                ) ?? null,
              packet: { id: packetId, name: payload.packet_name },
              item: matchedItem
                ? {
                    id: matchedItem.id,
                    company_id: matchedItem.company_id,
                    packet_vendor_id: matchedItem.packet_vendor_id,
                    code: matchedItem.code,
                    name: matchedItem.name,
                    type: matchedItem.type,
                  }
                : null,
            };
          }
        );
        itemPacketsStore = [
          ...itemPacketsStore.filter((ip) => ip.packet_id !== packetId),
          ...updatedItemPackets,
        ];

        const matchedName =
          packetNamesStore.find(
            (n) =>
              n.name.trim().toLowerCase() ===
              payload.packet_name.trim().toLowerCase()
          ) ??
          (() => {
            const added = {
              id: packetNamesStore.length + 10,
              name: payload.packet_name,
            };
            packetNamesStore = [...packetNamesStore, added];
            return added;
          })();
        const matchedCat =
          packetCategoriesStore.find(
            (c) =>
              c.name.trim().toLowerCase() ===
              payload.packet_category.trim().toLowerCase()
          ) ??
          (() => {
            const added = {
              id: packetCategoriesStore.length + 10,
              name: payload.packet_category,
            };
            packetCategoriesStore = [...packetCategoriesStore, added];
            return added;
          })();

        const updated: apiClient.DefaultPackage = {
          id,
          brand_name: payload.brand_name,
          packet_name_id: matchedName.id,
          company_id: payload.company_id ?? null,
          packet_vendor_id: payload.packet_vendor_id ?? null,
          packet_category_id: matchedCat.id,
          packet_id: packetId,
          item_packet_id: updatedItemPackets[0]?.id ?? 10,
          price: totalPrice,
          packet_name: matchedName,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
          packet_vendor:
            packetVendorsStore.find((v) => v.id === payload.packet_vendor_id) ??
            null,
          packet_category: matchedCat,
          item_packet: updatedItemPackets[0] ?? itemPacketsStore[0],
        };
        defaultPackagesStore = defaultPackagesStore.map((dp) =>
          dp.id === id ? updated : dp
        );
        ingredientsStore = [
          ...ingredientsStore.filter((ing) => ing.default_package_id !== id),
          ...payload.items.map((row, idx) => ({
            id: 600 + idx,
            default_package_id: id,
            item_id: row.item_id,
            price: row.price ?? 0,
            default_package: updated,
            item:
              itemsCatalogStore.find((item) => item.id === row.item_id) ?? null,
          })),
        ];
        return { data: updated };
      }
    );
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

    // 2. Click Input Paket -> shows Master Paket and View Paket Awal child cards (Master Bahan Baku deprecated)
    fireEvent.click(inputPaketCard);
    const paketSubmenu = screen.getByTestId('horizontal-submenu-INPUT_PAKET');
    const masterPaketCard = within(paketSubmenu).getByTestId(
      'horizontal-menu-card-MASTER_PAKET'
    );
    const viewPaketAwalCard = within(paketSubmenu).getByTestId(
      'horizontal-menu-card-VIEW_PAKET_AWAL'
    );
    expect(masterPaketCard).toHaveTextContent('Master Paket');
    expect(
      within(paketSubmenu).queryByTestId(
        'horizontal-menu-card-MASTER_BAHAN_BAKU'
      )
    ).not.toBeInTheDocument();
    expect(viewPaketAwalCard).toHaveTextContent('View Paket Awal');

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

    // Tab 2: Paket Awal (3-screen wizard on left panel + existing DefaultPackage list on right panel)
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

    const defaultTablePanel = screen.getByTestId(
      'master-paket-crud-modal-table-panel'
    );
    expect(
      await within(defaultTablePanel).findByText('Brand Awal')
    ).toBeInTheDocument();
    expect(within(defaultTablePanel).getByText('Rp 120.000')).toBeInTheDocument();

    // Screen 1: fill Nama Paket, Kategori Paket, Nama Brand, and Vendor Paket (Company OR PacketVendor)
    expect(screen.getByTestId('paket-awal-wizard-step-1')).toBeInTheDocument();
    fireEvent.change(within(defaultModal).getByLabelText('Nama Paket'), {
      target: { value: 'Paket Hemat Baru' },
    });
    fireEvent.change(within(defaultModal).getByLabelText('Kategori Paket'), {
      target: { value: 'Kategori Spesial' },
    });
    fireEvent.change(within(defaultModal).getByLabelText('Nama Brand'), {
      target: { value: 'Brand Nusantara' },
    });

    const ownerSelect = within(defaultModal).getByLabelText(
      'Vendor Paket'
    ) as HTMLSelectElement;
    expect(Array.from(ownerSelect.options).map((o) => o.value)).toContain(
      'vendor:1'
    );
    expect(Array.from(ownerSelect.options).map((o) => o.value)).toContain(
      'company:1'
    );
    fireEvent.change(ownerSelect, { target: { value: 'company:1' } });
    fireEvent.click(screen.getByTestId('paket-awal-wizard-next-1'));

    // Screen 2: searchable Cari Item dropdown shows only Company 1 items, clicking an item adds it to Daftar Item Bahan
    expect(screen.getByTestId('paket-awal-wizard-step-2')).toBeInTheDocument();
    expect(
      screen.getByTestId('paket-awal-wizard-empty-rows')
    ).toBeInTheDocument();

    const searchInput = screen.getByTestId('paket-awal-wizard-search');
    fireEvent.focus(searchInput);

    const dropdown = await screen.findByTestId(
      'paket-awal-wizard-search-dropdown'
    );
    expect(within(dropdown).getByText('Kardus Packing')).toBeInTheDocument();
    expect(within(dropdown).getByText('Lakban Bening')).toBeInTheDocument();
    expect(
      within(dropdown).queryByText('Kopi Robusta Vendor')
    ).not.toBeInTheDocument();
    expect(
      within(dropdown).queryByText('Plastik Segel')
    ).not.toBeInTheDocument();

    // Filter by typing 'Kardus' -> click row to add Kardus Packing to Daftar Item Bahan
    fireEvent.change(searchInput, { target: { value: 'Kardus' } });
    expect(within(dropdown).getByText('Kardus Packing')).toBeInTheDocument();
    expect(
      within(dropdown).queryByText('Lakban Bening')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('wizard-search-option-30'));
    expect(screen.getByTestId('wizard-item-name-0')).toHaveTextContent(
      'Kardus Packing'
    );
    expect(screen.getByTestId('wizard-item-code-0')).toHaveTextContent(
      'ITM-001'
    );
    fireEvent.change(
      within(screen.getByTestId('wizard-item-row-0')).getByLabelText('Qty'),
      { target: { value: '3' } }
    );

    // Focus Cari Item again -> Kardus Packing is excluded, click Lakban Bening to add as row 2
    fireEvent.focus(searchInput);
    const secondDropdown = await screen.findByTestId(
      'paket-awal-wizard-search-dropdown'
    );
    expect(
      within(secondDropdown).queryByText('Kardus Packing')
    ).not.toBeInTheDocument();
    expect(
      within(secondDropdown).getByText('Lakban Bening')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('wizard-search-option-31'));
    expect(screen.getByTestId('wizard-item-name-1')).toHaveTextContent(
      'Lakban Bening'
    );
    expect(screen.getByTestId('wizard-item-code-1')).toHaveTextContent(
      'ITM-002'
    );
    fireEvent.change(
      within(screen.getByTestId('wizard-item-row-1')).getByLabelText('Qty'),
      { target: { value: '5' } }
    );

    fireEvent.click(screen.getByTestId('paket-awal-wizard-next-2'));

    // Screen 3: input per-item price (used only for Ingredient.price) and Total Harga Paket Awal (DefaultPackage.price untouched) and Simpan
    expect(screen.getByTestId('paket-awal-wizard-step-3')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('wizard-price-row-0')).queryByText(/Qty:/)
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('wizard-price-input-0'), {
      target: { value: '15000' },
    });
    fireEvent.change(screen.getByTestId('wizard-price-input-1'), {
      target: { value: '25000' },
    });

    fireEvent.change(screen.getByTestId('paket-awal-wizard-total-price-input'), {
      target: { value: '250000' },
    });

    fireEvent.click(screen.getByTestId('paket-awal-wizard-save'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createDefaultPackageWizard).toHaveBeenCalledWith({
        packet_name: 'Paket Hemat Baru',
        packet_category: 'Kategori Spesial',
        brand_name: 'Brand Nusantara',
        company_id: 1,
        price: 250000,
        items: [
          { item_id: 30, quantity: 3, price: 15000 },
          { item_id: 31, quantity: 5, price: 25000 },
        ],
      });
      expect(
        within(defaultTablePanel).getByText('Brand Nusantara')
      ).toBeInTheDocument();
      expect(
        within(defaultTablePanel).getByText('Rp 250.000')
      ).toBeInTheDocument();
    });

    // Wizard resets back to Screen 1 after saving
    expect(screen.getByTestId('paket-awal-wizard-step-1')).toBeInTheDocument();

    // Edit newly created Paket Awal (row 51) via wizard -> Screen 1..3 hydrated -> update -> Perbarui
    fireEvent.click(within(defaultTablePanel).getByTestId('edit-row-51'));
    expect(
      screen.getByTestId('paket-awal-wizard-cancel-edit')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nama Paket')).toHaveValue('Paket Hemat Baru');
    expect(screen.getByLabelText('Kategori Paket')).toHaveValue(
      'Kategori Spesial'
    );
    expect(screen.getByLabelText('Nama Brand')).toHaveValue('Brand Nusantara');
    expect(screen.getByLabelText('Vendor Paket')).toHaveValue('company:1');

    // Cancel edit resets form back to create mode
    fireEvent.click(screen.getByTestId('paket-awal-wizard-cancel-edit'));
    expect(
      screen.queryByTestId('paket-awal-wizard-cancel-edit')
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nama Paket')).toHaveValue('');

    // Re-enter edit mode for row 51 and complete Screen 1 -> Screen 2 -> Screen 3 -> Perbarui
    fireEvent.click(within(defaultTablePanel).getByTestId('edit-row-51'));
    fireEvent.change(screen.getByLabelText('Nama Brand'), {
      target: { value: 'Brand Nusantara Edited' },
    });
    fireEvent.click(screen.getByTestId('paket-awal-wizard-next-1'));

    // Screen 2 hydrated with 2 items (qty 3 and 5)
    expect(screen.getByTestId('paket-awal-wizard-step-2')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-item-name-0')).toHaveTextContent(
      'Kardus Packing'
    );
    expect(
      within(screen.getByTestId('wizard-item-row-0')).getByLabelText('Qty')
    ).toHaveValue(3);
    expect(screen.getByTestId('wizard-item-name-1')).toHaveTextContent(
      'Lakban Bening'
    );
    expect(
      within(screen.getByTestId('wizard-item-row-1')).getByLabelText('Qty')
    ).toHaveValue(5);

    // Update qty on row 0 to 4 and remove row 1
    fireEvent.change(
      within(screen.getByTestId('wizard-item-row-0')).getByLabelText('Qty'),
      { target: { value: '4' } }
    );
    fireEvent.click(
      within(screen.getByTestId('wizard-item-row-1')).getByRole('button', {
        name: 'Hapus',
      })
    );
    fireEvent.click(screen.getByTestId('paket-awal-wizard-next-2'));

    // Screen 3 hydrated item price 15000 & total price 250000 -> update item price to 20000 and total price to 175000 -> Perbarui
    expect(screen.getByTestId('paket-awal-wizard-step-3')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-price-input-0')).toHaveValue('15.000');
    fireEvent.change(screen.getByTestId('wizard-price-input-0'), {
      target: { value: '20000' },
    });
    expect(
      screen.getByTestId('paket-awal-wizard-total-price-input')
    ).toHaveValue('250.000');
    fireEvent.change(screen.getByTestId('paket-awal-wizard-total-price-input'), {
      target: { value: '175000' },
    });

    fireEvent.click(screen.getByTestId('paket-awal-wizard-save'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateDefaultPackageWizard).toHaveBeenCalledWith(51, {
        packet_name: 'Paket Hemat Baru',
        packet_category: 'Kategori Spesial',
        brand_name: 'Brand Nusantara Edited',
        company_id: 1,
        price: 175000,
        items: [{ item_id: 30, quantity: 4, price: 20000 }],
      });
      expect(
        within(defaultTablePanel).getByText('Brand Nusantara Edited')
      ).toBeInTheDocument();
      expect(
        within(defaultTablePanel).getByText('Rp 175.000')
      ).toBeInTheDocument();
    });

    fireEvent.click(within(defaultTablePanel).getByTestId('delete-row-51'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteDefaultPackage).toHaveBeenCalledWith(51);
      expect(
        within(defaultTablePanel).queryByText('Brand Nusantara Edited')
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

  it('shows Input Paket -> View Paket Awal strictly read-only DefaultPackage datatable with Detail inspection modal', async () => {
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
        packet_vendor_id: 1,
        company_id: null,
        code: null,
        name: 'Garam Halus',
        type: 'Bahan',
      },
    ];

    const itemPacketsStore: apiClient.ItemPacket[] = [
      {
        id: 10,
        company_id: 1,
        packet_id: 20,
        item_id: 101,
        quantity: 2,
        company: companiesStore[0],
        packet: { id: 20, name: 'Paket Starter Pack' },
        item: itemsStore[0],
      },
      {
        id: 11,
        company_id: 1,
        packet_id: 20,
        item_id: 102,
        quantity: 3,
        company: companiesStore[0],
        packet: { id: 20, name: 'Paket Starter Pack' },
        item: itemsStore[1],
      },
    ];

    const defaultPackagesStore: apiClient.DefaultPackage[] = [
      {
        id: 50,
        brand_name: 'Brand Satu',
        packet_name_id: 1,
        company_id: 1,
        packet_vendor_id: null,
        packet_category_id: 1,
        packet_id: 20,
        item_packet_id: 10,
        price: 100000,
        packet_name: { id: 1, name: 'Paket Starter' },
        company: companiesStore[0],
        packet_category: { id: 1, name: 'Kategori Reguler' },
        packet: { id: 20, name: 'Paket Starter Pack' },
        item_packet: itemPacketsStore[0],
      },
      {
        id: 51,
        brand_name: 'Brand Dua',
        packet_name_id: 2,
        company_id: null,
        packet_vendor_id: 1,
        packet_category_id: 2,
        packet_id: 21,
        item_packet_id: 12,
        price: 150000,
        packet_name: { id: 2, name: 'Paket Pro' },
        packet_vendor: { id: 1, name: 'Vendor Utama' },
        packet_category: { id: 2, name: 'Kategori Premium' },
        packet: { id: 21, name: 'Paket Pro Pack' },
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
      data: itemPacketsStore,
      meta: { count: itemPacketsStore.length },
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
      within(paketSubmenu).getByTestId('horizontal-menu-card-VIEW_PAKET_AWAL')
    );

    const viewModal = await screen.findByTestId('view-paket-awal-modal');
    expect(viewModal).toBeInTheDocument();

    // Strictly read-only: no form panel, no Tambah/Edit/Hapus buttons
    expect(
      screen.queryByTestId('view-paket-awal-modal-form-panel')
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

    // DefaultPackage rows & total summary banner
    expect(await within(viewModal).findByText('Brand Satu')).toBeInTheDocument();
    expect(within(viewModal).getByText('Paket Starter')).toBeInTheDocument();
    expect(within(viewModal).getByText('Kategori Reguler')).toBeInTheDocument();
    expect(
      within(viewModal).getByText('PT. Slaras Nusa Foodlab')
    ).toBeInTheDocument();
    expect(within(viewModal).getByText('2 item')).toBeInTheDocument();
    expect(within(viewModal).getByText('Rp 100.000')).toBeInTheDocument();

    expect(within(viewModal).getByText('Brand Dua')).toBeInTheDocument();
    expect(within(viewModal).getByText('Vendor Utama')).toBeInTheDocument();
    expect(within(viewModal).getByText('1 item')).toBeInTheDocument();
    expect(within(viewModal).getByText('Rp 150.000')).toBeInTheDocument();

    expect(
      screen.getByTestId('view-paket-awal-total-banner-value')
    ).toHaveTextContent('Rp 250.000');

    // Click Detail button on Brand Satu (50)
    fireEvent.click(within(viewModal).getByTestId('detail-paket-awal-row-50'));

    const detailModal = await screen.findByTestId(
      'view-paket-awal-detail-modal'
    );
    expect(detailModal).toBeInTheDocument();
    expect(
      within(detailModal).getByRole('heading', { name: 'Brand Satu' })
    ).toBeInTheDocument();
    expect(
      within(detailModal).getByText('PT. Slaras Nusa Foodlab')
    ).toBeInTheDocument();
    expect(
      within(detailModal).getByText('Kategori Reguler')
    ).toBeInTheDocument();
    expect(
      within(detailModal).getByText('Paket Starter Pack')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('view-paket-awal-detail-total-banner-value')
    ).toHaveTextContent('Rp 100.000');

    // Individual item rows with Qty (Harga (Rp) column hidden) in Detail modal
    expect(within(detailModal).getByText('BHN-01')).toBeInTheDocument();
    expect(within(detailModal).getByText('Tepung Terigu')).toBeInTheDocument();
    expect(within(detailModal).getByText('BHN-02')).toBeInTheDocument();
    expect(within(detailModal).getByText('Gula Pasir')).toBeInTheDocument();
    expect(
      within(detailModal).queryByText('Harga (Rp)')
    ).not.toBeInTheDocument();
    expect(
      within(detailModal).queryByText('Rp 12.000')
    ).not.toBeInTheDocument();
    expect(
      within(detailModal).queryByText('Rp 18.500')
    ).not.toBeInTheDocument();

    // Close detail modal and main view modal
    fireEvent.click(
      within(detailModal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('view-paket-awal-detail-modal')
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(viewModal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('view-paket-awal-modal')
    ).not.toBeInTheDocument();
  });
});
