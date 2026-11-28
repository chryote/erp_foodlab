import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  CPO_MENU_ITEMS,
  DEFAULT_CPO_MODULE,
} from '../modules/CPO/CpoModuleCard';
import { getDashboardMenuPage } from '../pages/menuPages';

vi.mock('../api/client');

function renderApp() {
  const queryClient = createAppQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard-flow-simulator']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CPO Input Packing menu deprecation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearActiveCompanyId();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    clearActiveCompanyId();
    window.localStorage.clear();
  });

  it('excludes Input Packing from CPO_MENU_ITEMS, CPO horizontal menu, and menu routes', async () => {
    expect(CPO_MENU_ITEMS.map((item) => item.code)).toEqual([
      'INPUT_ITEM',
      'INPUT_PAKET',
    ]);
    expect(
      getDashboardMenuPage(
        '/dashboard/company/1/menu/CPO/INPUT_PACKING/master-packing'
      )
    ).toBeNull();
    expect(
      getDashboardMenuPage(
        '/dashboard/company/1/menu/CPO/INPUT_PACKING/view-packing'
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
    expect(
      within(cpoMenu).queryByTestId('horizontal-menu-card-INPUT_PACKING')
    ).not.toBeInTheDocument();
    expect(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_ITEM')
    ).toBeInTheDocument();
    expect(
      within(cpoMenu).getByTestId('horizontal-menu-card-INPUT_PAKET')
    ).toBeInTheDocument();
  });
});
