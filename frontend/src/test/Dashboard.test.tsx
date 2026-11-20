import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../Pages/Dashboard';
import * as apiClient from '../api/client';

vi.mock('../api/client');

describe('Dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.fetchCurrentUser).mockResolvedValue({
      data: {
        id: 1,
        name: 'ERP Administrator',
        email: 'admin@foodlab.test',
      },
    });
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchCompanyAssets).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchExpenseCategories).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchExpenseTypes).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchExpenseItems).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
  });

  it('shows the signed-in user and calls the logout action', async () => {
    const onLogout = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard onLogout={onLogout} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('ERP Administrator')).toBeInTheDocument();
    expect(screen.getByText('admin@foodlab.test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keluar' }));

    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('shows the selected company asset value and opens the asset view', async () => {
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [{ id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 }],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchCompanyAssets).mockResolvedValue({
      data: [
        {
          id: 10,
          company_id: 1,
          asset_date: '2026-03-01',
          name: 'Freezer Laboratorium',
          amount: 1,
          price_per_unit: 75_000_000,
          total_price: 75_000_000,
        },
      ],
      meta: { count: 1 },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Rp 75.000.000')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /View aset perusahaan/ })
    );

    const assetModal = await screen.findByTestId('view-aset-modal');
    expect(
      within(assetModal).getByTestId('view-aset-total-banner-value')
    ).toHaveTextContent('Rp 75.000.000');
    expect(
      within(assetModal).getByText('Freezer Laboratorium')
    ).toBeInTheDocument();
  });
});
