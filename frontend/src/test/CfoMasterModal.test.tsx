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
    expect(stakeholderPanel).toHaveClass('lg:block');
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
});
