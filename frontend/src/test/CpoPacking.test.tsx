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

describe('CPO Input Packing flow: Master Packing (Item, Packet, ItemPacket)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearActiveCompanyId();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    clearActiveCompanyId();
    window.localStorage.clear();
  });

  it('shows Input Packing -> Master Packing modal with split layout and full CRUD for Item, Packet, and ItemPacket', async () => {
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

    let itemsStore: apiClient.Item[] = [
      {
        id: 10,
        company_id: 1,
        code: 'ITM-001',
        name: 'Kardus Packing 30x20',
        type: 'Bahan',
        company: companiesStore[0],
      },
      {
        id: 11,
        company_id: 2,
        code: null,
        name: 'Lakban Cabang 2',
        type: 'Peralatan',
        company: companiesStore[1],
      },
    ];

    vi.mocked(apiClient.fetchCpoEnums).mockResolvedValue({
      data: {
        item_type: [
          { value: 'Bahan', nama: 'Bahan' },
          { value: 'Peralatan', nama: 'Peralatan' },
          { value: 'Paket Usaha', nama: 'Paket Usaha' },
        ],
      },
    });

    vi.mocked(apiClient.fetchItems).mockImplementation(async () => ({
      data: [...itemsStore],
      meta: { count: itemsStore.length },
    }));

    vi.mocked(apiClient.createItem).mockImplementation(async (payload) => {
      const created: apiClient.Item = {
        id: 12,
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

    let packetsStore: apiClient.Packet[] = [
      {
        id: 20,
        name: 'Paket Starter Lab',
      },
    ];

    vi.mocked(apiClient.fetchPackets).mockImplementation(async () => ({
      data: [...packetsStore],
      meta: { count: packetsStore.length },
    }));

    vi.mocked(apiClient.createPacket).mockImplementation(async (payload) => {
      const created: apiClient.Packet = {
        id: 21,
        name: payload.name,
      };
      packetsStore = [created, ...packetsStore];
      return { data: created };
    });

    vi.mocked(apiClient.updatePacket).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.Packet = {
          id,
          name: payload.name,
        };
        packetsStore = packetsStore.map((packet) =>
          packet.id === id ? updated : packet
        );
        return { data: updated };
      }
    );

    vi.mocked(apiClient.deletePacket).mockImplementation(async (id) => {
      packetsStore = packetsStore.filter((packet) => packet.id !== id);
      return { message: 'Packet deleted successfully.' };
    });

    let itemPacketsStore: apiClient.ItemPacket[] = [
      {
        id: 30,
        company_id: 1,
        packet_id: 20,
        item_id: 10,
        quantity: 2,
        company: companiesStore[0],
        packet: packetsStore[0],
        item: itemsStore[0],
      },
    ];

    vi.mocked(apiClient.fetchItemPackets).mockImplementation(async () => ({
      data: [...itemPacketsStore],
      meta: { count: itemPacketsStore.length },
    }));

    vi.mocked(apiClient.createItemPacket).mockImplementation(
      async (payload) => {
        const created: apiClient.ItemPacket = {
          id: 31,
          company_id: payload.company_id,
          packet_id: payload.packet_id,
          item_id: payload.item_id,
          quantity: payload.quantity,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
          packet:
            packetsStore.find((p) => p.id === payload.packet_id) ?? null,
          item: itemsStore.find((i) => i.id === payload.item_id) ?? null,
        };
        itemPacketsStore = [created, ...itemPacketsStore];
        return { data: created };
      }
    );

    vi.mocked(apiClient.updateItemPacket).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.ItemPacket = {
          id,
          company_id: payload.company_id,
          packet_id: payload.packet_id,
          item_id: payload.item_id,
          quantity: payload.quantity,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
          packet:
            packetsStore.find((p) => p.id === payload.packet_id) ?? null,
          item: itemsStore.find((i) => i.id === payload.item_id) ?? null,
        };
        itemPacketsStore = itemPacketsStore.map((assignment) =>
          assignment.id === id ? updated : assignment
        );
        return { data: updated };
      }
    );

    vi.mocked(apiClient.deleteItemPacket).mockImplementation(async (id) => {
      itemPacketsStore = itemPacketsStore.filter(
        (assignment) => assignment.id !== id
      );
      return { message: 'Item packet deleted successfully.' };
    });

    renderApp();

    // 1. Select company & open CPO module
    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    const inputPackingCard = within(cpoMenu).getByTestId(
      'horizontal-menu-card-INPUT_PACKING'
    );
    expect(inputPackingCard).toHaveTextContent('Input Packing');
    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_PACKING')
    ).not.toBeInTheDocument();

    // 2. Click Input Packing -> shows Master Packing child menu
    fireEvent.click(inputPackingCard);
    const packingSubmenu = screen.getByTestId(
      'horizontal-submenu-INPUT_PACKING'
    );
    const masterPackingCard = within(packingSubmenu).getByTestId(
      'horizontal-menu-card-MASTER_PACKING'
    );
    expect(masterPackingCard).toHaveTextContent('Master Packing');
    const viewPackingCard = within(packingSubmenu).getByTestId(
      'horizontal-menu-card-VIEW_PACKING'
    );
    expect(viewPackingCard).toHaveTextContent('View Packing');

    // 3. Click Master Packing -> shows Master Packing modal with Master Operasional style
    fireEvent.click(masterPackingCard);
    const modal = await screen.findByTestId('master-packing-crud-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('master-packing-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-packing-crud-modal-form-panel')
    );
    expect(
      screen.getByTestId('master-packing-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-packing-crud-modal-table-panel')
    );
    expect(screen.getByTestId('master-packing-crud-modal-form')).toHaveClass(
      'flex-col'
    );
    expect(
      screen.getByTestId('master-packing-crud-modal-company_id-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');

    const tabItem = screen.getByTestId('master-packing-tab-item');
    const tabPacket = screen.getByTestId('master-packing-tab-packet');
    const tabAssignment = screen.getByTestId('master-packing-tab-assignment');
    expect(tabItem).toHaveTextContent('Item');
    expect(tabPacket).toHaveTextContent('Paket');
    expect(tabAssignment).toHaveTextContent('Item Paket');
    expect(tabItem).toHaveAttribute('aria-selected', 'true');

    // Tab 1: Item CRUD
    expect(
      await within(modal).findByText('Kardus Packing 30x20')
    ).toBeInTheDocument();
    expect(within(modal).getByText('Lakban Cabang 2')).toBeInTheDocument();

    const itemCompanySelect = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    expect(itemCompanySelect.value).toBe('1');
    expect(within(modal).getByText('ITM-001')).toBeInTheDocument();

    fireEvent.change(within(modal).getByLabelText('Kode Item'), {
      target: { value: 'ITM-012' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Sealer Mesin' },
    });
    fireEvent.change(within(modal).getByLabelText('Tipe Item'), {
      target: { value: 'Peralatan' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createItem).toHaveBeenCalledWith({
        company_id: 1,
        code: 'ITM-012',
        name: 'Sealer Mesin',
        type: 'Peralatan',
      });
      expect(within(modal).getByText('ITM-012')).toBeInTheDocument();
      expect(within(modal).getByText('Sealer Mesin')).toBeInTheDocument();
    });

    fireEvent.click(within(modal).getByTestId('edit-row-12'));
    fireEvent.change(within(modal).getByLabelText('Kode Item'), {
      target: { value: '' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Sealer Mesin Pro' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateItem).toHaveBeenCalledWith(12, {
        company_id: 1,
        code: null,
        name: 'Sealer Mesin Pro',
        type: 'Peralatan',
      });
      expect(within(modal).getByText('Sealer Mesin Pro')).toBeInTheDocument();
    });

    fireEvent.click(within(modal).getByTestId('delete-row-12'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteItem).toHaveBeenCalledWith(12);
      expect(
        within(modal).queryByText('Sealer Mesin Pro')
      ).not.toBeInTheDocument();
    });

    // Tab 2: Packet CRUD
    fireEvent.click(tabPacket);
    expect(tabPacket).toHaveAttribute('aria-selected', 'true');
    expect(
      await within(modal).findByText('Paket Starter Lab')
    ).toBeInTheDocument();

    fireEvent.change(within(modal).getByLabelText('Nama Paket'), {
      target: { value: 'Paket Hemat' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createPacket).toHaveBeenCalledWith({
        name: 'Paket Hemat',
      });
      expect(within(modal).getByText('Paket Hemat')).toBeInTheDocument();
    });

    fireEvent.click(within(modal).getByTestId('edit-row-21'));
    fireEvent.change(within(modal).getByLabelText('Nama Paket'), {
      target: { value: 'Paket Hemat Ekstra' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updatePacket).toHaveBeenCalledWith(21, {
        name: 'Paket Hemat Ekstra',
      });
      expect(
        within(modal).getByText('Paket Hemat Ekstra')
      ).toBeInTheDocument();
    });

    // Tab 3: ItemPacket Assignment CRUD
    fireEvent.click(tabAssignment);
    expect(tabAssignment).toHaveAttribute('aria-selected', 'true');
    const assignmentTablePanel = screen.getByTestId(
      'master-packing-crud-modal-table-panel'
    );
    expect(
      await within(assignmentTablePanel).findByText(
        'Kardus Packing 30x20 (Bahan)'
      )
    ).toBeInTheDocument();

    const assignCompanySelect = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    const assignPacketSelect = within(modal).getByLabelText(
      'Pilih Paket'
    ) as HTMLSelectElement;
    const assignItemSelect = within(modal).getByLabelText(
      'Pilih Item'
    ) as HTMLSelectElement;

    expect(assignCompanySelect.value).toBe('1');
    // Company 1 items are visible; company 2 items are excluded
    expect(
      Array.from(assignItemSelect.options).map((opt) => opt.textContent)
    ).toContain('Kardus Packing 30x20 (Bahan)');
    expect(
      Array.from(assignItemSelect.options).map((opt) => opt.textContent)
    ).not.toContain('Lakban Cabang 2 (Peralatan)');

    // Switching company resets item selection and filters items to selected company
    fireEvent.change(assignItemSelect, { target: { value: '10' } });
    expect(assignItemSelect.value).toBe('10');
    fireEvent.change(assignCompanySelect, { target: { value: '2' } });
    expect(assignItemSelect.value).toBe('');
    expect(
      Array.from(assignItemSelect.options).map((opt) => opt.textContent)
    ).toContain('Lakban Cabang 2 (Peralatan)');

    fireEvent.change(assignCompanySelect, { target: { value: '1' } });
    fireEvent.change(assignPacketSelect, { target: { value: '21' } });
    fireEvent.change(assignItemSelect, { target: { value: '10' } });
    fireEvent.change(within(modal).getByLabelText('Jumlah'), {
      target: { value: '4' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createItemPacket).toHaveBeenCalledWith({
        company_id: 1,
        packet_id: 21,
        item_id: 10,
        quantity: 4,
      });
      expect(
        within(assignmentTablePanel).getByText('Paket Hemat Ekstra')
      ).toBeInTheDocument();
      expect(within(assignmentTablePanel).getByText('4')).toBeInTheDocument();
    });

    fireEvent.click(within(modal).getByTestId('edit-row-31'));
    fireEvent.change(within(modal).getByLabelText('Jumlah'), {
      target: { value: '7' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateItemPacket).toHaveBeenCalledWith(31, {
        company_id: 1,
        packet_id: 21,
        item_id: 10,
        quantity: 7,
      });
      expect(within(assignmentTablePanel).getByText('7')).toBeInTheDocument();
    });

    fireEvent.click(within(modal).getByTestId('delete-row-31'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteItemPacket).toHaveBeenCalledWith(31);
    });

    // Delete packet 21 from Packet tab
    fireEvent.click(tabPacket);
    fireEvent.click(within(modal).getByTestId('delete-row-21'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deletePacket).toHaveBeenCalledWith(21);
      expect(
        within(modal).queryByText('Paket Hemat Ekstra')
      ).not.toBeInTheDocument();
    });

    fireEvent.click(
      within(modal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('master-packing-crud-modal')
    ).not.toBeInTheDocument();
  });

  it('shows Input Packing -> View Packing modal as read-only grouped by company_id and packet_id with Detail inspection', async () => {
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
        id: 10,
        company_id: 1,
        code: 'ITM-001',
        name: 'Kardus Packing 30x20',
        type: 'Bahan',
        company: companiesStore[0],
      },
      {
        id: 11,
        company_id: 1,
        code: null,
        name: 'Bubble Wrap Roll',
        type: 'Bahan',
        company: companiesStore[0],
      },
      {
        id: 12,
        company_id: 2,
        code: 'ITM-002',
        name: 'Lakban Cabang 2',
        type: 'Peralatan',
        company: companiesStore[1],
      },
    ];

    const packetsStore: apiClient.Packet[] = [
      { id: 20, name: 'Paket Hemat Pemula' },
      { id: 21, name: 'Paket Ekspres' },
    ];

    const itemPacketsStore: apiClient.ItemPacket[] = [
      {
        id: 30,
        company_id: 1,
        packet_id: 20,
        item_id: 10,
        quantity: 2,
        company: companiesStore[0],
        packet: packetsStore[0],
        item: itemsStore[0],
      },
      {
        id: 31,
        company_id: 1,
        packet_id: 20,
        item_id: 11,
        quantity: 3,
        company: companiesStore[0],
        packet: packetsStore[0],
        item: itemsStore[1],
      },
      {
        id: 32,
        company_id: 2,
        packet_id: 20,
        item_id: 12,
        quantity: 4,
        company: companiesStore[1],
        packet: packetsStore[0],
        item: itemsStore[2],
      },
    ];

    vi.mocked(apiClient.fetchItems).mockResolvedValue({
      data: itemsStore,
      meta: { count: itemsStore.length },
    });
    vi.mocked(apiClient.fetchPackets).mockResolvedValue({
      data: packetsStore,
      meta: { count: packetsStore.length },
    });
    vi.mocked(apiClient.fetchItemPackets).mockResolvedValue({
      data: itemPacketsStore,
      meta: { count: itemPacketsStore.length },
    });

    renderApp();

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    fireEvent.click(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_PACKING')
    );

    const packingSubmenu = screen.getByTestId(
      'horizontal-submenu-INPUT_PACKING'
    );
    fireEvent.click(
      within(packingSubmenu).getByTestId('horizontal-menu-card-VIEW_PACKING')
    );

    const viewModal = await screen.findByTestId('view-packing-modal');
    expect(viewModal).toBeInTheDocument();

    // Strictly read-only: no form panel, no Tambah/Edit/Hapus buttons
    expect(
      screen.queryByTestId('view-packing-modal-form-panel')
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

    // Grouped by (company_id, packet_id):
    // Group 1 (id 30): company 1 + packet 20 -> 2 items, total 5 qty
    // Group 2 (id 32): company 2 + packet 20 -> 1 item, total 4 qty
    expect(
      await within(viewModal).findByText(
        'Kardus Packing 30x20 (ITM-001) x2, Bubble Wrap Roll x3'
      )
    ).toBeInTheDocument();
    expect(within(viewModal).getByText('2 item')).toBeInTheDocument();
    expect(within(viewModal).getByText('5 qty')).toBeInTheDocument();

    expect(
      within(viewModal).getByText('Lakban Cabang 2 (ITM-002) x4')
    ).toBeInTheDocument();
    expect(within(viewModal).getByText('1 item')).toBeInTheDocument();
    expect(within(viewModal).getByText('4 qty')).toBeInTheDocument();

    expect(
      screen.getByTestId('view-packing-total-banner-value')
    ).toHaveTextContent('3 Item (9 Qty)');

    // Click Detail button on Group 1 (company 1, packet 20 -> row id 30)
    fireEvent.click(within(viewModal).getByTestId('detail-packing-row-30'));

    const detailModal = await screen.findByTestId('view-packing-detail-modal');
    expect(detailModal).toBeInTheDocument();
    expect(
      within(detailModal).getByRole('heading', { name: 'Paket Hemat Pemula' })
    ).toBeInTheDocument();
    expect(
      within(detailModal).getByText('PT. Slaras Nusa Foodlab')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('view-packing-detail-total-banner-value')
    ).toHaveTextContent('5 Qty');

    // Individual ItemPacket rows in Detail modal
    expect(within(detailModal).getByText('ITM-001')).toBeInTheDocument();
    expect(
      within(detailModal).getByText('Kardus Packing 30x20')
    ).toBeInTheDocument();
    expect(within(detailModal).getByText('2 qty')).toBeInTheDocument();
    expect(
      within(detailModal).getByText('Bubble Wrap Roll')
    ).toBeInTheDocument();
    expect(within(detailModal).getByText('3 qty')).toBeInTheDocument();

    // Close detail modal and main View Packing modal
    fireEvent.click(
      within(detailModal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('view-packing-detail-modal')
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(viewModal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(
      screen.queryByTestId('view-packing-modal')
    ).not.toBeInTheDocument();
  });

  it('syncs Master Packing Tipe Item dropdown from CPO enums endpoint and submits Paket Usaha', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [DEFAULT_CPO_MODULE],
      meta: { count: 1 },
    });

    const companiesStore: apiClient.Company[] = [
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
    ];
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: companiesStore,
      meta: { count: 1 },
    });
    vi.mocked(apiClient.syncActiveCompany).mockResolvedValue({
      data: companiesStore[0],
    });
    vi.mocked(apiClient.fetchCpoEnums).mockResolvedValue({
      data: {
        item_type: [
          { value: 'Bahan', nama: 'Bahan' },
          { value: 'Peralatan', nama: 'Peralatan' },
          { value: 'Paket Usaha', nama: 'Paket Usaha' },
        ],
      },
    });
    vi.mocked(apiClient.fetchItems).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchPackets).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchItemPackets).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.createItem).mockResolvedValue({
      data: {
        id: 99,
        company_id: 1,
        code: 'ITM-PU-01',
        name: 'Booth Usaha',
        type: 'Paket Usaha',
        company: companiesStore[0],
      },
    });

    renderApp();

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    fireEvent.click(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_PACKING')
    );
    const submenu = screen.getByTestId('horizontal-submenu-INPUT_PACKING');
    fireEvent.click(
      within(submenu).getByTestId('horizontal-menu-card-MASTER_PACKING')
    );

    const modal = await screen.findByTestId('master-packing-crud-modal');
    const typeSelect = within(modal).getByLabelText('Tipe Item') as HTMLSelectElement;

    await waitFor(() => {
      const optionValues = Array.from(typeSelect.options).map((opt) => opt.value);
      expect(optionValues).toContain('Paket Usaha');
    });

    fireEvent.change(within(modal).getByLabelText('Kode Item'), {
      target: { value: 'ITM-PU-01' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Item'), {
      target: { value: 'Booth Usaha' },
    });
    fireEvent.change(typeSelect, {
      target: { value: 'Paket Usaha' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createItem).toHaveBeenCalledWith({
        company_id: 1,
        code: 'ITM-PU-01',
        name: 'Booth Usaha',
        type: 'Paket Usaha',
      });
    });
  });

  it('filters Master Packing Item and Item Paket datatables and Pilih Vendor dropdown to Utama and Packing companies only', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [DEFAULT_CPO_MODULE],
      meta: { count: 1 },
    });

    const companiesStore: apiClient.Company[] = [
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1, type: 'Utama' },
      { id: 2, name: 'PT. Packing', series: 1, type: 'Packing' },
      { id: 3, name: 'PT. Produksi', series: 1, type: 'Produksi' },
    ];
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: companiesStore,
      meta: { count: companiesStore.length },
    });
    vi.mocked(apiClient.syncActiveCompany).mockResolvedValue({
      data: companiesStore[0],
    });
    vi.mocked(apiClient.fetchCpoEnums).mockResolvedValue({
      data: {
        item_type: [
          { value: 'Bahan', nama: 'Bahan' },
          { value: 'Peralatan', nama: 'Peralatan' },
          { value: 'Paket Usaha', nama: 'Paket Usaha' },
        ],
      },
    });
    vi.mocked(apiClient.fetchItems).mockResolvedValue({
      data: [
        {
          id: 101,
          company_id: 1,
          code: 'ITM-UTM',
          name: 'Item Utama',
          type: 'Bahan',
          company: companiesStore[0],
        },
        {
          id: 102,
          company_id: 2,
          code: 'ITM-PCK',
          name: 'Item Packing',
          type: 'Peralatan',
          company: companiesStore[1],
        },
        {
          id: 103,
          company_id: 3,
          code: 'ITM-PRD',
          name: 'Item Produksi',
          type: 'Bahan',
          company: companiesStore[2],
        },
      ],
      meta: { count: 3 },
    });
    vi.mocked(apiClient.fetchPackets).mockResolvedValue({
      data: [{ id: 201, name: 'Paket Uji' }],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchItemPackets).mockResolvedValue({
      data: [
        {
          id: 301,
          company_id: 1,
          packet_id: 201,
          item_id: 101,
          quantity: 2,
          company: companiesStore[0],
          packet: { id: 201, name: 'Paket Uji' },
          item: {
            id: 101,
            company_id: 1,
            code: 'ITM-UTM',
            name: 'Item Utama',
            type: 'Bahan',
          },
        },
        {
          id: 302,
          company_id: 2,
          packet_id: 201,
          item_id: 102,
          quantity: 3,
          company: companiesStore[1],
          packet: { id: 201, name: 'Paket Uji' },
          item: {
            id: 102,
            company_id: 2,
            code: 'ITM-PCK',
            name: 'Item Packing',
            type: 'Peralatan',
          },
        },
        {
          id: 303,
          company_id: 3,
          packet_id: 201,
          item_id: 103,
          quantity: 5,
          company: companiesStore[2],
          packet: { id: 201, name: 'Paket Uji' },
          item: {
            id: 103,
            company_id: 3,
            code: 'ITM-PRD',
            name: 'Item Produksi',
            type: 'Bahan',
          },
        },
      ],
      meta: { count: 3 },
    });

    renderApp();

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    fireEvent.click(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_PACKING')
    );
    const submenu = screen.getByTestId('horizontal-submenu-INPUT_PACKING');
    fireEvent.click(
      within(submenu).getByTestId('horizontal-menu-card-MASTER_PACKING')
    );

    const modal = await screen.findByTestId('master-packing-crud-modal');

    // Tab 1 (Item): Pilih Vendor dropdown & datatable only include Utama & Packing
    expect(await within(modal).findByText('Item Utama')).toBeInTheDocument();
    expect(within(modal).getByText('Item Packing')).toBeInTheDocument();
    expect(within(modal).queryByText('Item Produksi')).not.toBeInTheDocument();

    const itemVendorSelect = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    expect(
      Array.from(itemVendorSelect.options).map((opt) => opt.textContent)
    ).toEqual(['Pilih vendor...', 'PT. Slaras Nusa Foodlab', 'PT. Packing']);

    // Tab 3 (Item Paket): Pilih Vendor dropdown & datatable only include Utama & Packing
    fireEvent.click(screen.getByTestId('master-packing-tab-assignment'));
    const tablePanel = screen.getByTestId(
      'master-packing-crud-modal-table-panel'
    );
    expect(
      await within(tablePanel).findByText('Item Utama (Bahan)')
    ).toBeInTheDocument();
    expect(
      within(tablePanel).getByText('Item Packing (Peralatan)')
    ).toBeInTheDocument();
    expect(
      within(tablePanel).queryByText('Item Produksi (Bahan)')
    ).not.toBeInTheDocument();

    const assignVendorSelect = within(modal).getByLabelText(
      'Pilih Vendor'
    ) as HTMLSelectElement;
    expect(
      Array.from(assignVendorSelect.options).map((opt) => opt.textContent)
    ).toEqual(['Pilih vendor...', 'PT. Slaras Nusa Foodlab', 'PT. Packing']);
  });
});
