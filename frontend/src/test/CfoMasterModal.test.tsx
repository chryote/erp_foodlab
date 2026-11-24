import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      meta: { count: 1 },
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

  it('loads ten more rows on scroll and searches each table', async () => {
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: Array.from({ length: 25 }, (_, index) => ({
        id: 21 + index,
        name: `Company ${index + 1}`,
        series: 1,
      })),
      meta: { count: 25 },
    });
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: Array.from({ length: 25 }, (_, index) => ({
        id: 31 + index,
        company_id: 21,
        stakeholder_name: `Owner ${index + 1}`,
        capital: 250000,
      })),
      meta: { count: 25 },
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
    const searchAndWait = async (testId: string, value: string) => {
      vi.useFakeTimers();
      try {
        fireEvent.change(screen.getByTestId(testId), {
          target: { value },
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
      } finally {
        vi.useRealTimers();
      }
    };

    scrollToBottom('perusahaan-table-scroll');
    expect(screen.getByText('Company 11')).toBeInTheDocument();
    expect(screen.queryByTestId('perusahaan-pagination')).not.toBeInTheDocument();
    scrollToBottom('perusahaan-table-scroll');
    expect(screen.getByText('Company 21')).toBeInTheDocument();
    await searchAndWait('perusahaan-table-search', 'Company 2');
    expect(screen.getByText('Company 2')).toBeInTheDocument();
    expect(screen.getByText('Company 21')).toBeInTheDocument();
    expect(screen.queryByText('Company 1')).not.toBeInTheDocument();
    await searchAndWait('perusahaan-table-search', '');

    fireEvent.click(screen.getByTestId('stakeholder-row-21'));
    expect(await screen.findByText('Owner 1')).toBeInTheDocument();
    expect(screen.queryByText('Owner 11')).not.toBeInTheDocument();
    scrollToBottom('pemegang-saham-table-scroll');
    expect(screen.getByText('Owner 11')).toBeInTheDocument();
    await searchAndWait('pemegang-saham-table-search', 'Owner 2');
    expect(screen.getByText('Owner 2')).toBeInTheDocument();
    expect(screen.getByText('Owner 21')).toBeInTheDocument();
    expect(screen.queryByText('Owner 1')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('pemegang-saham-pagination')
    ).not.toBeInTheDocument();
  });

  it('sorts supported columns on header clicks and keeps the table headers sticky', async () => {
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [
        { id: 21, name: 'Zeta', series: 2 },
        { id: 22, name: 'Alpha', series: 3 },
        { id: 23, name: 'Beta', series: 1 },
      ],
      meta: { count: 3 },
    });
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: [
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
      ],
      meta: { count: 3 },
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
    expect(getCompanyNames()).toEqual(['Alpha', 'Beta', 'Zeta']);
    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Seri' }));
    expect(getCompanyNames()).toEqual(['Beta', 'Zeta', 'Alpha']);

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
    expect(getStakeholderNames()).toEqual(['Owner A', 'Owner B', 'Owner Z']);
    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Kapital' }));
    expect(getStakeholderNames()).toEqual(['Owner Z', 'Owner B', 'Owner A']);
  });
});
