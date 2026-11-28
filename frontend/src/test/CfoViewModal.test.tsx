import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '@/api/client';
import CfoViewModalPage from '@/pages/menu/CFO/INPUT_MODAL/view-modal';

vi.mock('@/api/client');

const originalWindowWidth = window.innerWidth;

describe('CFO view modal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [{ id: 21, name: 'FoodLab', series: 1 }],
      meta: { count: 1 },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalWindowWidth,
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

  it('creates, edits, and deletes stakeholders scoped to the selected company', async () => {
    const user = userEvent.setup();
    const existingStakeholder = {
      id: 31,
      company_id: 21,
      stakeholder_name: 'Existing Owner',
      capital: 250000,
    };
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: [existingStakeholder],
      meta: {
        count: 1,
        total: 1,
        total_capital: existingStakeholder.capital,
        page: 1,
        per_page: 10,
        last_page: 1,
      },
    });
    vi.mocked(apiClient.createCapitalCompany).mockResolvedValue({
      data: {
        id: 32,
        company_id: 21,
        stakeholder_name: 'New Owner',
        capital: 300000,
      },
    });
    vi.mocked(apiClient.updateCapitalCompany).mockResolvedValue({
      data: {
        ...existingStakeholder,
        stakeholder_name: 'Updated Owner',
        capital: 350000,
      },
    });
    vi.mocked(apiClient.deleteCapitalCompany).mockResolvedValue({
      message: 'Deleted',
    });
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

    await screen.findByText('Existing Owner');
    const formSection = screen.getByTestId('pemegang-saham-form-section');
    const tableSection = screen.getByTestId('pemegang-saham-table-section');
    expect(formSection).toContainElement(
      screen.getByLabelText('Nama Pemegang Saham')
    );
    expect(tableSection).toContainElement(
      screen.getByText('Total Kapital FoodLab')
    );
    expect(tableSection).toContainElement(
      screen.getByTestId('pemegang-saham-table-scroll')
    );

    await user.type(screen.getByLabelText('Nama Pemegang Saham'), 'New Owner');
    await user.type(screen.getByLabelText('Kapital (Rp)'), '300000');
    await user.keyboard('{Enter}');
    expect(
      await screen.findByText('Tambah pemegang saham baru?')
    ).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() =>
      expect(apiClient.createCapitalCompany).toHaveBeenCalledWith({
        company_id: 21,
        stakeholder_name: 'New Owner',
        capital: 300000,
      })
    );

    await user.click(
      screen.getByRole('button', { name: 'Perbarui Existing Owner' })
    );
    const nameInput = screen.getByLabelText('Nama Pemegang Saham');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Owner{Enter}');
    expect(
      await screen.findByText('Perbarui data pemegang saham Updated Owner?')
    ).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() =>
      expect(apiClient.updateCapitalCompany).toHaveBeenCalledWith(31, {
        company_id: 21,
        stakeholder_name: 'Updated Owner',
        capital: 250000,
      })
    );

    await user.click(
      screen.getByRole('button', { name: 'Hapus Existing Owner' })
    );
    expect(
      await screen.findByText('Hapus pemegang saham Existing Owner?')
    ).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() =>
      expect(apiClient.deleteCapitalCompany).toHaveBeenCalledWith(31)
    );
  });

  it('moves the stakeholder form into a modal on mobile', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: [
        {
          id: 31,
          company_id: 21,
          stakeholder_name: 'Existing Owner',
          capital: 250000,
        },
      ],
      meta: { count: 1, total_capital: 250000 },
    });
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

    fireEvent.resize(window);
    await screen.findByText('Existing Owner');
    expect(
      screen.queryByTestId('pemegang-saham-form-section')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('pemegang-saham-table-section')
    ).toContainElement(screen.getByTestId('pemegang-saham-table-scroll'));

    await user.click(screen.getByTestId('pemegang-saham-open-form-mobile'));
    expect(
      await screen.findByRole('dialog', { name: 'Tambah Pemegang Saham' })
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Tutup Modal' })
    );

    await user.click(
      screen.getByRole('button', { name: 'Perbarui Existing Owner' })
    );
    const editDialog = await screen.findByRole('dialog', {
      name: 'Perbarui Pemegang Saham',
    });
    expect(editDialog).toBeInTheDocument();
    expect(
      screen.getByLabelText('Nama Pemegang Saham')
    ).toHaveValue('Existing Owner');
  });
});
