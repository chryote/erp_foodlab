import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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
});
