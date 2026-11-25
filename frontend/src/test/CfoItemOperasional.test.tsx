import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as apiClient from '@/api/client';
import CfoItemOperasionalPage from '@/pages/menu/CFO/INPUT_OPERASIONAL/item-operasional';

vi.mock('@/api/client');

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          '/dashboard/company/21/menu/CFO/INPUT_OPERASIONAL/item-operasional',
        ]}
      >
        <Routes>
          <Route
            path="/dashboard/company/:companyId/menu/CFO/INPUT_OPERASIONAL/item-operasional"
            element={<CfoItemOperasionalPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function makeItem(id: number): apiClient.ExpenseItem {
  return {
    id,
    company_id: 21,
    expense_category_id: 31,
    expense_type_id: 41,
    name: `Item ${id}`,
    amount: id * 100,
    purchased_on: '2026-11-18',
    detail: `Detail ${id}`,
  };
}

describe('CFO item operasional', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [{ id: 21, name: 'FoodLab', series: 1 }],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchExpenseCategories).mockResolvedValue({
      data: [{ id: 31, company_id: 21, name: 'Bahan Baku' }],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchExpenseTypes).mockResolvedValue({
      data: [
        {
          id: 41,
          company_id: 21,
          expense_category_id: 31,
          name: 'Dairy',
        },
      ],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchExpenseItems).mockResolvedValue({
      data: [makeItem(1)],
      meta: { count: 1, total: 1, page: 1, per_page: 10, last_page: 1 },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('searches and sorts item results through paginated server queries', async () => {
    vi.mocked(apiClient.fetchExpenseItems).mockResolvedValue({
      data: [makeItem(1)],
      meta: { count: 1, total: 14, page: 1, per_page: 10, last_page: 2 },
    });

    renderPage();

    await waitFor(() => {
      expect(apiClient.fetchExpenseItems).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          per_page: 10,
          company_id: 21,
          sort: '-id',
        })
      );
    });
    expect(apiClient.fetchExpenseItems).not.toHaveBeenCalledWith(undefined);

    fireEvent.change(await screen.findByTestId('operasional-item-search'), {
      target: { value: 'Susu' },
    });
    await waitFor(
      () => {
        expect(apiClient.fetchExpenseItems).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Susu' })
        );
      },
      { timeout: 3000 }
    );
    await screen.findByText('Item 1');

    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Nama Item' }));
    await waitFor(() => {
      expect(apiClient.fetchExpenseItems).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'name' })
      );
    });
  });

  it('loads the next server page on scroll and lets the user retry a failed page', async () => {
    let secondPageRequests = 0;
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.mocked(apiClient.fetchExpenseItems).mockImplementation(async (params) => {
      if (params?.page === 2) {
        secondPageRequests += 1;
        if (secondPageRequests === 1) {
          throw new Error('The server returned 500');
        }
        return {
          data: [makeItem(11)],
          meta: { count: 1, total: 11, page: 2, per_page: 10, last_page: 2 },
        };
      }

      return {
        data: Array.from({ length: 10 }, (_, index) => makeItem(index + 1)),
        meta: { count: 10, total: 11, page: 1, per_page: 10, last_page: 2 },
      };
    });

    renderPage();
    const scrollContainer = await screen.findByTestId(
      'operasional-item-table-scroll'
    );
    await screen.findByText('Item 10');
    Object.defineProperties(scrollContainer, {
      scrollHeight: { configurable: true, value: 100 },
      clientHeight: { configurable: true, value: 50 },
      scrollTop: { configurable: true, value: 50 },
    });

    fireEvent.scroll(scrollContainer);
    expect(await screen.findByText('The server returned 500')).toBeInTheDocument();
    expect(apiClient.fetchExpenseItems).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, company_id: 21 })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Item 11')).toBeInTheDocument();
  });
});
