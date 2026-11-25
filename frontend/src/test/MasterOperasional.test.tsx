import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '@/api/client';
import CfoMasterOperasionalPage from '@/pages/menu/CFO/INPUT_OPERASIONAL/master-operasional';

vi.mock('@/api/client');

describe('CFO master operasional', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [{ id: 21, name: 'FoodLab', series: 1 }],
      meta: { count: 1 },
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

  it('keeps the confirmation modal open and shows loading while saving', async () => {
    let finishCreate:
      | ((result: Awaited<ReturnType<typeof apiClient.createExpenseCategory>>) => void)
      | undefined;
    vi.mocked(apiClient.createExpenseCategory).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreate = resolve;
        })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            '/dashboard/company/21/menu/CFO/INPUT_OPERASIONAL/master-operasional',
          ]}
        >
          <Routes>
            <Route
              path="/dashboard/company/:companyId/menu/CFO/INPUT_OPERASIONAL/master-operasional"
              element={<CfoMasterOperasionalPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.change(await screen.findByTestId('master-operasional-category-name'), {
      target: { value: 'Bahan Baku' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah kategori' }));

    const dialog = await screen.findByTestId('master-operasional-confirm');
    const confirmButton = within(dialog).getByTestId(
      'master-operasional-confirm-confirm'
    );
    fireEvent.click(confirmButton);

    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'Menyimpan...'
    );
    expect(confirmButton).toBeDisabled();
    expect(dialog).toBeInTheDocument();

    finishCreate?.({
      data: { id: 91, company_id: 21, name: 'Bahan Baku' },
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId('master-operasional-confirm')
      ).not.toBeInTheDocument();
    });
    expect(apiClient.createExpenseCategory).toHaveBeenCalledWith({
      company_id: 21,
      name: 'Bahan Baku',
    });
  });

  it('loads the type table with server-side filtering and sorting', async () => {
    vi.mocked(apiClient.fetchExpenseCategories).mockResolvedValue({
      data: [
        { id: 21, company_id: 21, name: 'Zeta' },
        { id: 22, company_id: 21, name: 'Alpha' },
      ],
      meta: { count: 2 },
    });
    vi.mocked(apiClient.fetchExpenseTypes).mockResolvedValue({
      data: [
        { id: 31, company_id: 21, expense_category_id: 21, name: 'First' },
        { id: 32, company_id: 21, expense_category_id: 22, name: 'Second' },
      ],
      meta: { count: 2 },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            '/dashboard/company/21/menu/CFO/INPUT_OPERASIONAL/master-operasional',
          ]}
        >
          <Routes>
            <Route
              path="/dashboard/company/:companyId/menu/CFO/INPUT_OPERASIONAL/master-operasional"
              element={<CfoMasterOperasionalPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByTestId('master-operasional-tab-tipe'));
    const table = await screen.findByTestId(
      'master-operasional-tipe-table-scroll'
    );
    expect(
      within(table).queryByRole('button', { name: 'Urutkan Kategori' })
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(apiClient.fetchExpenseTypes).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          per_page: 10,
          company_id: 21,
          sort: '-id',
        })
      );
    });

    fireEvent.change(screen.getByTestId('master-operasional-tipe-search'), {
      target: { value: 'Dairy' },
    });
    await waitFor(
      () => {
        expect(apiClient.fetchExpenseTypes).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Dairy' })
        );
      },
      { timeout: 3000 }
    );

    const filteredTable = await screen.findByTestId(
      'master-operasional-tipe-table-scroll'
    );
    fireEvent.click(
      within(filteredTable).getByRole('button', { name: 'Urutkan Nama Tipe' })
    );
    await waitFor(() => {
      expect(apiClient.fetchExpenseTypes).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'name' })
      );
    });
  });
});
