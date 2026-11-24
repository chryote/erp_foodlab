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
      'Pilih Perusahaan'
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
      'Pilih Perusahaan'
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
});
