import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    expect(await screen.findByTestId('logout-confirm-dialog')).toBeInTheDocument();
    expect(onLogout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('logout-confirm-dialog-cancel'));
    expect(screen.queryByTestId('logout-confirm-dialog')).not.toBeInTheDocument();
    expect(onLogout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Keluar' }));
    expect(await screen.findByTestId('logout-confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('logout-confirm-dialog-confirm'));
    expect(onLogout).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByTestId('logout-confirm-dialog')).not.toBeInTheDocument();
    });
  });

  it('switches company series and company from the dashboard header', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [
        { id: 1, name: 'FoodLab Utama', series: 1 },
        { id: 2, name: 'FoodLab Barat', series: 2 },
        { id: 3, name: 'FoodLab Timur', series: 2 },
      ],
      meta: { count: 3 },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await user.click(await screen.findByTestId('dashboard-series-tab-2'));
    expect(
      await screen.findByTestId('dashboard-company-tab-2')
    ).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByTestId('dashboard-company-tab-3'));
    await user.keyboard('{ArrowDown}{ArrowRight}{ArrowRight}{Enter}');
    expect(screen.getByTestId('dashboard-company-tab-3')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      screen.getByText('Ringkasan keuangan dan operasional untuk FoodLab Timur.')
    ).toBeInTheDocument();
  });

});
