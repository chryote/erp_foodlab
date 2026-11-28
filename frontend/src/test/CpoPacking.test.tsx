import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as apiClient from '../api/client';
import { clearActiveCompanyId } from '../lib/activeCompanyStorage';
import { createAppQueryClient } from '../lib/cfoResources';
import { DEFAULT_CDO_MODULE } from '../modules/CDO/CdoModuleCard';
import { DEFAULT_CFO_MODULE } from '../modules/CFO/CfoModuleCard';
import { DEFAULT_CHO_MODULE } from '../modules/CHO/ChoModuleCard';
import { DEFAULT_CMO_MODULE } from '../modules/CMO/CmoModuleCard';
import {
  CPO_INPUT_PACKING_ITEMS,
  DEFAULT_CPO_MODULE,
} from '../modules/CPO/CpoModuleCard';
import { ViewPackingModal } from '../modules/CPO/ViewPackingModal';
import { getDashboardMenuPage } from '../pages/menuPages';

vi.mock('../api/client');

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/dashboard-flow-simulator']}>
      <App />
    </MemoryRouter>
  );
}

function renderViewPackingModal(
  company: apiClient.Company,
  companies: apiClient.Company[]
) {
  const queryClient = createAppQueryClient();
  const Harness = () => {
    const [open, setOpen] = useState(true);
    return (
      <QueryClientProvider client={queryClient}>
        <ViewPackingModal
          isOpen={open}
          company={company}
          companies={companies}
          onClose={() => setOpen(false)}
        />
      </QueryClientProvider>
    );
  };
  return render(<Harness />);
}

describe('CPO Input Packing flow: View Packing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearActiveCompanyId();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    clearActiveCompanyId();
    window.localStorage.clear();
  });

  it('drops Master Packing from Input Packing child menu and route', async () => {
    expect(CPO_INPUT_PACKING_ITEMS.map((item) => item.code)).toEqual([
      'VIEW_PACKING',
    ]);
    expect(
      getDashboardMenuPage(
        '/dashboard/company/1/menu/CPO/INPUT_PACKING/master-packing'
      )
    ).toBeNull();

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
    ];
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: companiesStore,
      meta: { count: companiesStore.length },
    });
    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (id) => ({
      data: companiesStore.find((c) => c.id === id) ?? null,
    }));

    renderApp();

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CPO'));

    const cpoMenu = await screen.findByTestId('cpo-horizontal-menu');
    fireEvent.click(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_PACKING')
    );

    const submenu = await screen.findByTestId(
      'horizontal-submenu-INPUT_PACKING'
    );
    expect(
      within(submenu).queryByTestId('horizontal-menu-card-MASTER_PACKING')
    ).not.toBeInTheDocument();
    expect(
      within(submenu).getByTestId('horizontal-menu-card-VIEW_PACKING')
    ).toBeInTheDocument();
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

    renderViewPackingModal(companiesStore[0], companiesStore);

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
});
