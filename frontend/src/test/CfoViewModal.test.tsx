import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '@/api/client';
import CfoViewModalPage from '@/pages/menu/CFO/INPUT_MODAL/view-modal';

vi.mock('@/api/client');

describe('CFO view modal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [{ id: 21, name: 'FoodLab', series: 1 }],
      meta: { count: 1 },
    });
  });

  it('loads stakeholder pages and sends search and sort to the server', async () => {
    const allStakeholders = Array.from({ length: 25 }, (_, index) => ({
      id: 31 + index,
      company_id: 21,
      stakeholder_name: `Owner ${index + 1}`,
      capital: (index + 1) * 1000,
    }));
    vi.mocked(apiClient.fetchCapitalCompanies).mockImplementation(
      async (params) => {
        let matching = allStakeholders.filter(
          (item) =>
            params?.company_id === undefined ||
            item.company_id === params.company_id
        );
        if (params?.search) {
          matching = matching.filter((item) =>
            item.stakeholder_name.toLowerCase().includes(
              params.search!.toLowerCase()
            ) ||
            (Number.isFinite(Number(params.search)) &&
              item.capital === Number(params.search))
          );
        }
        if (params?.sort === 'stakeholder_name') {
          matching = [...matching].sort((a, b) =>
            a.stakeholder_name.localeCompare(b.stakeholder_name)
          );
        } else if (params?.sort === 'capital') {
          matching = [...matching].sort((a, b) => a.capital - b.capital);
        } else if (params?.sort === '-capital') {
          matching = [...matching].sort((a, b) => b.capital - a.capital);
        } else {
          matching = [...matching].sort((a, b) => b.id - a.id);
        }

        const page = params?.page ?? 1;
        const perPage = params?.per_page ?? 10;
        return {
          data: matching.slice((page - 1) * perPage, page * perPage),
          meta: {
            count: Math.min(perPage, matching.length),
            total: matching.length,
            total_capital: allStakeholders.reduce(
              (sum, item) => sum + item.capital,
              0
            ),
            page,
            per_page: perPage,
            last_page: Math.ceil(matching.length / perPage),
          },
        };
      }
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/company/21']}>
          <Routes>
            <Route
              path="/company/:companyId"
              element={<CfoViewModalPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Owner 25')).toBeInTheDocument();
    expect(screen.queryByText('Owner 15')).not.toBeInTheDocument();

    const scrollContainer = screen.getByTestId('pemegang-saham-table-scroll');
    Object.defineProperties(scrollContainer, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, writable: true, value: 600 },
    });
    fireEvent.scroll(scrollContainer);
    expect(await screen.findByText('Owner 15')).toBeInTheDocument();
    expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 21, page: 2, per_page: 10 })
    );

    fireEvent.change(screen.getByTestId('pemegang-saham-table-search'), {
      target: { value: 'Owner 2' },
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 600));
    });
    expect(await screen.findByText('Owner 2')).toBeInTheDocument();
    expect(screen.queryByText('Owner 1')).not.toBeInTheDocument();
    expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 21,
        search: 'Owner 2',
        page: 1,
      })
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Urutkan Nama Pemegang Saham' })
    );
    await waitFor(() =>
      expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 21,
          search: 'Owner 2',
          sort: 'stakeholder_name',
        })
      )
    );

    fireEvent.change(screen.getByTestId('pemegang-saham-table-search'), {
      target: { value: '12000' },
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 600));
    });
    expect(await screen.findByText('Owner 12')).toBeInTheDocument();
    expect(screen.queryByText('Owner 1')).not.toBeInTheDocument();
    expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 21,
        search: '12000',
        page: 1,
      })
    );
  });
});
