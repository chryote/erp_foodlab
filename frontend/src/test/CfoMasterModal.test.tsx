import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '@/api/client';
import CfoMasterModalPage from '@/pages/menu/CFO/INPUT_MODAL/master-modal';

vi.mock('@/api/client');

describe('CFO master modal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [{ id: 21, name: 'FoodLab', series: 1 }],
      meta: { count: 1 },
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
  });

  it('keeps the split panel available and preserves stakeholder form data when closing the mobile modal', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CfoMasterModalPage />
      </QueryClientProvider>
    );

    const companyPanel = screen.getByTestId('perusahaan-crud-page');
    expect(companyPanel).toBeInTheDocument();
    expect(companyPanel).toHaveClass('lg:overflow-y-auto');
    const stakeholderPanel = screen.getByTestId('pemegang-saham');
    expect(stakeholderPanel).toHaveClass('hidden');
    expect(stakeholderPanel).toHaveClass('lg:flex');
    expect(stakeholderPanel).toHaveClass('lg:overflow-y-auto');

    fireEvent.click(await screen.findByTestId('stakeholder-row-21'));
    expect(await screen.findByText('Existing Owner')).toBeInTheDocument();
    expect(stakeholderPanel).toHaveClass('block');
    expect(
      screen.getByRole('button', { name: 'Tutup pemegang saham' })
    ).toHaveClass('lg:hidden');

    const nameInput = screen.getByLabelText('Nama Pemegang Saham');
    fireEvent.change(nameInput, { target: { value: 'Draft Owner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pemegang saham' }));

    await waitFor(() => {
      expect(stakeholderPanel).toHaveClass('hidden');
    });
    expect(nameInput).toHaveValue('Draft Owner');

    fireEvent.click(screen.getByTestId('stakeholder-row-21'));
    expect(stakeholderPanel).toHaveClass('block');
    expect(nameInput).toHaveValue('Draft Owner');
  });

  it('submits create and edit forms with Enter', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CfoMasterModalPage />
      </QueryClientProvider>
    );

    await user.type(
      await screen.findByLabelText('Nama Perusahaan'),
      'New Company{Enter}'
    );
    expect(await screen.findByText('Tambah perusahaan baru?')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-dialog-cancel'));

    await user.click(screen.getByRole('button', { name: 'Perbarui FoodLab' }));
    const companySeries = screen.getByLabelText('Seri');
    await user.clear(companySeries);
    await user.type(companySeries, '2{Enter}');
    expect(
      await screen.findByText('Perbarui data perusahaan FoodLab?')
    ).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-dialog-cancel'));

    await user.click(await screen.findByTestId('stakeholder-row-21'));
    const stakeholderName = await screen.findByLabelText(
      'Nama Pemegang Saham'
    );
    await user.type(stakeholderName, 'New Owner');
    const createCapital = screen.getByLabelText('Kapital (Rp)');
    await user.type(createCapital, '300000{Enter}');
    expect(createCapital).toHaveValue('300.000');
    expect(
      await screen.findByText('Tambah pemegang saham baru?')
    ).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-dialog-cancel'));

    await user.click(
      screen.getByRole('button', { name: 'Perbarui Existing Owner' })
    );
    const editStakeholderName = screen.getByLabelText('Nama Pemegang Saham');
    await user.clear(editStakeholderName);
    await user.type(editStakeholderName, 'Updated Owner{Enter}');
    expect(
      await screen.findByText('Perbarui data pemegang saham Updated Owner?')
    ).toBeInTheDocument();
  });

  it('shows a saving state while company and stakeholder confirmations are pending', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let finishCompanyCreate:
      | ((result: Awaited<ReturnType<typeof apiClient.createCompany>>) => void)
      | undefined;
    let finishStakeholderCreate:
      | ((
          result: Awaited<ReturnType<typeof apiClient.createCapitalCompany>>
        ) => void)
      | undefined;

    vi.mocked(apiClient.createCompany).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCompanyCreate = resolve;
        })
    );
    vi.mocked(apiClient.createCapitalCompany).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishStakeholderCreate = resolve;
        })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <CfoMasterModalPage />
      </QueryClientProvider>
    );

    await user.type(
      await screen.findByLabelText('Nama Perusahaan'),
      'New Company{Enter}'
    );
    const companyConfirmButton = screen.getByTestId('confirm-dialog-confirm');
    await user.click(companyConfirmButton);
    await waitFor(() => expect(companyConfirmButton).toBeDisabled());
    expect(companyConfirmButton).toHaveTextContent('Menyimpan...');
    finishCompanyCreate?.({
      data: { id: 22, name: 'New Company', series: 1 },
    });
    await waitFor(() =>
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    );

    await user.click(await screen.findByTestId('stakeholder-row-21'));
    await user.type(await screen.findByLabelText('Nama Pemegang Saham'), 'Owner');
    const capitalInput = screen.getByLabelText('Kapital (Rp)');
    await user.type(capitalInput, '300000');
    expect(capitalInput).toHaveValue('300.000');
    await user.keyboard('{Enter}');
    const stakeholderConfirmButton = screen.getByTestId(
      'confirm-dialog-confirm'
    );
    await user.click(stakeholderConfirmButton);
    await waitFor(() => expect(stakeholderConfirmButton).toBeDisabled());
    expect(stakeholderConfirmButton).toHaveTextContent('Menyimpan...');
    expect(apiClient.createCapitalCompany).toHaveBeenCalledWith({
      company_id: 21,
      stakeholder_name: 'Owner',
      capital: 300000,
    });
    finishStakeholderCreate?.({
      data: {
        id: 32,
        company_id: 21,
        stakeholder_name: 'Owner',
        capital: 300000,
      },
    });
    await waitFor(() =>
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
    );
  });

  it('loads server pages on scroll and searches each table on the server', async () => {
    const companyRows = Array.from({ length: 25 }, (_, index) => ({
        id: 21 + index,
        name: index === 11 ? 'Series match' : `Company ${index + 1}`,
        series: index === 11 ? 2 : 1,
      }));
    vi.mocked(apiClient.fetchCompanies).mockImplementation(async (params) => {
      const matching = companyRows.filter((item) => {
        const matchesName =
          !params?.search ||
          item.name.toLowerCase().includes(params.search.toLowerCase());
        const matchesSeries =
          params?.series === undefined || item.series === params.series;
        return matchesName && matchesSeries;
      });
      const page = params?.page ?? 1;
      const perPage = params?.per_page ?? 10;
      return {
        data: matching.slice((page - 1) * perPage, page * perPage),
        meta: {
          count: Math.min(perPage, matching.length),
          total: matching.length,
          page,
          per_page: perPage,
          last_page: Math.ceil(matching.length / perPage),
          total_capital: stakeholderRows
            .filter((item) => item.company_id === 21)
            .reduce((sum, item) => sum + item.capital, 0),
        },
      };
    });
    const stakeholderRows = Array.from({ length: 25 }, (_, index) => ({
        id: 31 + index,
        company_id: 21,
        stakeholder_name: `Owner ${index + 1}`,
        capital: 250000,
      }));
    vi.mocked(apiClient.fetchCapitalCompanies).mockImplementation(
      async (params) => {
        const matching = stakeholderRows.filter((item) => {
          const matchesCompany =
            params?.company_id === undefined ||
            item.company_id === params.company_id;
          const matchesSearch =
            !params?.search ||
            item.stakeholder_name
              .toLowerCase()
              .includes(params.search.toLowerCase());
          return matchesCompany && matchesSearch;
        });
        const page = params?.page ?? 1;
        const perPage = params?.per_page ?? 10;
        return {
          data: matching.slice((page - 1) * perPage, page * perPage),
          meta: {
            count: Math.min(perPage, matching.length),
            total: matching.length,
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
        <CfoMasterModalPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Company 1')).toBeInTheDocument();
    expect(screen.queryByText('Company 11')).not.toBeInTheDocument();
    const scrollToBottom = (testId: string) => {
      const scrollContainer = screen.getByTestId(testId);
      Object.defineProperties(scrollContainer, {
        scrollHeight: { configurable: true, value: 1000 },
        clientHeight: { configurable: true, value: 400 },
        scrollTop: { configurable: true, writable: true, value: 600 },
      });
      fireEvent.scroll(scrollContainer);
    };
    const submitSearch = (testId: string, value: string) => {
      const input = screen.getByTestId(testId);
      fireEvent.change(input, {
        target: { value },
      });
      const form = input.closest('form');
      if (!form) throw new Error('Search input must be inside a form');
      fireEvent.submit(form);
    };

    scrollToBottom('perusahaan-table-scroll');
    expect(await screen.findByText('Company 11')).toBeInTheDocument();
    expect(apiClient.fetchCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, per_page: 10 })
    );
    expect(screen.queryByTestId('perusahaan-pagination')).not.toBeInTheDocument();
    scrollToBottom('perusahaan-table-scroll');
    expect(await screen.findByText('Company 21')).toBeInTheDocument();
    submitSearch('perusahaan-table-search', 'Company 2');
    expect(await screen.findByText('Company 2')).toBeInTheDocument();
    expect(apiClient.fetchCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Company 2', page: 1 })
    );
    expect(screen.getByText('Company 21')).toBeInTheDocument();
    expect(screen.queryByText('Company 1')).not.toBeInTheDocument();
    submitSearch('perusahaan-table-search', '');
    expect(await screen.findByText('Company 1')).toBeInTheDocument();
    submitSearch('perusahaan-table-search', '2');
    expect(await screen.findByText('Series match')).toBeInTheDocument();
    expect(apiClient.fetchCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ search: '2', page: 1 })
    );
    expect(apiClient.fetchCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ series: 2, page: 1 })
    );
    expect(
      screen.queryByTestId('perusahaan-series-search')
    ).not.toBeInTheDocument();
    submitSearch('perusahaan-table-search', '');
    expect(await screen.findByText('Company 1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('stakeholder-row-21'));
    expect(await screen.findByText('Owner 1')).toBeInTheDocument();
    expect(screen.queryByText('Owner 11')).not.toBeInTheDocument();
    scrollToBottom('pemegang-saham-table-scroll');
    expect(await screen.findByText('Owner 11')).toBeInTheDocument();
    expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 21, page: 2, per_page: 10 })
    );
    submitSearch('pemegang-saham-table-search', 'Owner 2');
    expect(await screen.findByText('Owner 2')).toBeInTheDocument();
    expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 21,
        search: 'Owner 2',
        page: 1,
      })
    );
    expect(screen.getByText('Owner 21')).toBeInTheDocument();
    expect(screen.queryByText('Owner 1')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('pemegang-saham-pagination')
    ).not.toBeInTheDocument();
  });

  it('shows a bottom-page error and retries a failed next-page request', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => ({
      id: 21 + index,
      name: `Company ${index + 1}`,
      series: 1,
    }));
    vi.mocked(apiClient.fetchCompanies)
      .mockResolvedValueOnce({
        data: firstPage,
        meta: { count: 10, page: 1, per_page: 10, last_page: 2 },
      })
      .mockRejectedValueOnce(new Error('Failed to fetch companies: 500'))
      .mockResolvedValueOnce({
        data: [{ id: 31, name: 'Company 11', series: 1 }],
        meta: { count: 1, page: 2, per_page: 10, last_page: 2 },
      });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CfoMasterModalPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Company 1')).toBeInTheDocument();
    const scrollContainer = screen.getByTestId('perusahaan-table-scroll');
    Object.defineProperties(scrollContainer, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, writable: true, value: 600 },
    });
    fireEvent.scroll(scrollContainer);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to fetch companies: 500'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Company 11')).toBeInTheDocument();
    expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(3);
  });

  it('uses the scroll container as the intersection observer root', async () => {
    const observedOptions: IntersectionObserverInit[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(
          private readonly callback: IntersectionObserverCallback,
          options: IntersectionObserverInit
        ) {
          observedOptions.push(options);
        }

        observe(target: Element) {
          this.callback(
            [{ isIntersecting: true, target } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver
          );
        }

        disconnect() {}
      }
    );

    vi.mocked(apiClient.fetchCompanies).mockImplementation(async (params) => ({
      data:
        params?.page === 1
          ? [{ id: 21, name: 'Company 1', series: 1 }]
          : [{ id: 22, name: 'Company 2', series: 1 }],
      meta: { count: 1, page: params?.page, per_page: 1, last_page: 2 },
    }));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    try {
      render(
        <QueryClientProvider client={queryClient}>
          <CfoMasterModalPage />
        </QueryClientProvider>
      );

      expect(await screen.findByText('Company 2')).toBeInTheDocument();
      expect(observedOptions[0]?.root).toBe(
        screen.getByTestId('perusahaan-table-scroll')
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('sorts supported columns on header clicks and keeps the table headers sticky', async () => {
    const companyRows = [
      { id: 21, name: 'Zeta', series: 2 },
      { id: 22, name: 'Alpha', series: 3 },
      { id: 23, name: 'Beta', series: 1 },
    ];
    vi.mocked(apiClient.fetchCompanies).mockImplementation(async (params) => {
      const rows = [...companyRows];
      if (params?.sort === 'name') {
        rows.sort((a, b) => a.name.localeCompare(b.name));
      } else if (params?.sort === 'series') {
        rows.sort((a, b) => a.series - b.series);
      }
      return {
        data: rows,
        meta: { count: rows.length, last_page: 1 },
      };
    });
    const stakeholderRows = [
        {
          id: 31,
          company_id: 21,
          stakeholder_name: 'Owner Z',
          capital: 100,
        },
        {
          id: 32,
          company_id: 21,
          stakeholder_name: 'Owner A',
          capital: 300,
        },
        {
          id: 33,
          company_id: 21,
          stakeholder_name: 'Owner B',
          capital: 200,
        },
      ];
    vi.mocked(apiClient.fetchCapitalCompanies).mockImplementation(
      async (params) => {
        const rows = [...stakeholderRows];
        if (params?.sort === 'stakeholder_name') {
          rows.sort((a, b) =>
            a.stakeholder_name.localeCompare(b.stakeholder_name)
          );
        } else if (params?.sort === 'capital') {
          rows.sort((a, b) => a.capital - b.capital);
        }
        return {
          data: rows,
          meta: { count: rows.length, last_page: 1, total_capital: 600 },
        };
      }
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CfoMasterModalPage />
      </QueryClientProvider>
    );

    const companySection = screen.getByTestId('perusahaan-crud-page');
    const getCompanyNames = () =>
      Array.from(
        companySection.querySelectorAll('tbody tr'),
        (row) => row.querySelector('td')?.textContent?.trim()
      );
    expect(await screen.findByText('Zeta')).toBeInTheDocument();
    expect(getCompanyNames()).toEqual(['Zeta', 'Alpha', 'Beta']);
    expect(companySection.querySelector('thead th')).toHaveClass(
      'sticky',
      'top-0'
    );
    expect(companySection.querySelector('thead th:last-child')).toHaveClass(
      'right-0',
      'z-20'
    );
    expect(companySection.querySelector('tbody td:last-child')).toHaveClass(
      'sticky',
      'right-0'
    );
    expect(companySection.querySelector('table')).toHaveClass(
      'table-auto',
      'w-max',
      'min-w-full'
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Urutkan Nama Perusahaan' })
    );
    await waitFor(() =>
      expect(getCompanyNames()).toEqual(['Alpha', 'Beta', 'Zeta'])
    );
    expect(apiClient.fetchCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'name' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Seri' }));
    await waitFor(() =>
      expect(getCompanyNames()).toEqual(['Beta', 'Zeta', 'Alpha'])
    );

    fireEvent.click(screen.getByTestId('stakeholder-row-21'));
    const stakeholderSection = screen.getByTestId('pemegang-saham');
    const getStakeholderNames = () =>
      Array.from(
        stakeholderSection.querySelectorAll('tbody tr'),
        (row) => row.querySelector('td')?.textContent?.trim()
      );
    expect(await screen.findByText('Owner Z')).toBeInTheDocument();
    expect(stakeholderSection.querySelector('thead th')).toHaveClass(
      'sticky',
      'top-0'
    );
    expect(
      stakeholderSection.querySelector('thead th:last-child')
    ).toHaveClass('right-0', 'z-20');
    fireEvent.click(
      screen.getByRole('button', { name: 'Urutkan Nama Pemegang Saham' })
    );
    await waitFor(() =>
      expect(getStakeholderNames()).toEqual(['Owner A', 'Owner B', 'Owner Z'])
    );
    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Kapital' }));
    await waitFor(() =>
      expect(getStakeholderNames()).toEqual(['Owner Z', 'Owner B', 'Owner A'])
    );
    expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'capital' })
    );
  });

  it('shows each stakeholder capital share and uses a 40/60 desktop split', async () => {
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: [
        {
          id: 31,
          company_id: 21,
          stakeholder_name: 'Quarter Owner',
          capital: 250000,
        },
        {
          id: 32,
          company_id: 21,
          stakeholder_name: 'Majority Owner',
          capital: 750000,
        },
      ],
      meta: { count: 2, total_capital: 1000000 },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CfoMasterModalPage />
      </QueryClientProvider>
    );

    const companySection = screen.getByTestId('perusahaan-crud-page');
    expect(companySection.parentElement).toHaveClass(
      'grid-cols-1',
      'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
    );
    fireEvent.click(await screen.findByTestId('stakeholder-row-21'));

    expect(await screen.findByText('25,00%')).toBeInTheDocument();
    expect(screen.getByText('25,00%').parentElement).toHaveClass(
      'whitespace-nowrap'
    );
    expect(screen.getByText('75,00%')).toBeInTheDocument();
  });

  it('shows a zero capital share when the company has no capital total', async () => {
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: [
        {
          id: 31,
          company_id: 21,
          stakeholder_name: 'No Capital Owner',
          capital: 0,
        },
      ],
      meta: { count: 1, total_capital: 0 },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CfoMasterModalPage />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByTestId('stakeholder-row-21'));
    expect(await screen.findByText('0,00%')).toBeInTheDocument();
  });
});
