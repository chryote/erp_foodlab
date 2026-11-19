import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as apiClient from '../api/client';
import { DEFAULT_CFO_MODULE } from '../modules/CFO/CfoModuleCard';
import { DEFAULT_CHO_MODULE } from '../modules/CHO/ChoModuleCard';
import { DEFAULT_CPO_MODULE } from '../modules/CPO/CpoModuleCard';
import { DEFAULT_CDO_MODULE } from '../modules/CDO/CdoModuleCard';
import { DEFAULT_CMO_MODULE } from '../modules/CMO/CmoModuleCard';

vi.mock('../api/client');

describe('App ERP Main Menu integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders PT. Slaras Nusa Foodlab header and all 5 ERP module cards (CFO, CHO, CPO, CDO, CMO)', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [
        DEFAULT_CFO_MODULE,
        DEFAULT_CHO_MODULE,
        DEFAULT_CPO_MODULE,
        DEFAULT_CDO_MODULE,
        DEFAULT_CMO_MODULE,
      ],
      meta: { count: 5 },
    });
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'PT. Slaras Nusa Foodlab',
          series: 1,
        },
      ],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.createCompany).mockResolvedValue({
      data: {
        id: 2,
        name: 'PT. Pangan Nusantara',
        series: 2,
      },
    });
    vi.mocked(apiClient.updateCompany).mockResolvedValue({
      data: {
        id: 2,
        name: 'PT. Pangan Nusantara Baru',
        series: 2,
      },
    });
    vi.mocked(apiClient.deleteCompany).mockResolvedValue({
      message: 'Company deleted successfully.',
    });
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: [
        {
          id: 101,
          company_id: 1,
          stakeholder_name: 'Rian',
          capital: 100000000,
        },
      ],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.createCapitalCompany).mockResolvedValue({
      data: {
        id: 102,
        company_id: 1,
        stakeholder_name: 'Budi Santoso',
        capital: 300000000.5,
      },
    });

    render(<App />);

    expect(screen.getByText('PT. Slaras Nusa Foodlab')).toBeInTheDocument();
    // Main ModuleCards are hidden by default until a secondary company tab is clicked
    expect(screen.queryByTestId('module-card-CFO')).not.toBeInTheDocument();
    expect(screen.queryByText('CFO (Keuangan)')).not.toBeInTheDocument();
    expect(screen.queryByText('CHO (SDM)')).not.toBeInTheDocument();
    expect(
      screen.queryByText('CPO (Persediaan Barang Dagang)')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('CDO (Pemasaran)')).not.toBeInTheDocument();
    expect(screen.queryByText('CMO (Penjualan)')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(apiClient.fetchErpModules).toHaveBeenCalledTimes(1);
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });

    const companyTab1 = screen.getByTestId('company-tab-1');
    expect(companyTab1).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(companyTab1);
    expect(companyTab1).toHaveAttribute('aria-selected', 'true');

    expect(screen.getByText('CFO (Keuangan)')).toBeInTheDocument();
    expect(screen.getByText('CHO (SDM)')).toBeInTheDocument();
    expect(screen.getByText('CPO (Persediaan Barang Dagang)')).toBeInTheDocument();
    expect(screen.getByText('CDO (Pemasaran)')).toBeInTheDocument();
    expect(screen.getByText('CMO (Penjualan)')).toBeInTheDocument();

    expect(screen.queryByTestId('cfo-horizontal-menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('module-card-CFO'));

    const cfoSubMenu = screen.getByTestId('cfo-horizontal-menu');
    expect(cfoSubMenu).toBeInTheDocument();
    expect(screen.getByText('Input Modal')).toBeInTheDocument();
    expect(screen.getByText('Input Operasional')).toBeInTheDocument();
    expect(screen.getByText('Input Aset')).toBeInTheDocument();
    expect(screen.getByText('Laba Rugi')).toBeInTheDocument();
    expect(screen.getByText('Neraca')).toBeInTheDocument();

    const inputModalCard = screen.getByTestId('horizontal-menu-card-INPUT_MODAL');
    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_MODAL')
    ).not.toBeInTheDocument();

    fireEvent.click(inputModalCard);
    expect(inputModalCard).toHaveAttribute('aria-pressed', 'true');

    const inputModalSubMenu = screen.getByTestId(
      'horizontal-submenu-INPUT_MODAL'
    );
    expect(inputModalSubMenu).toBeInTheDocument();
    expect(screen.getByText('Perusahaan')).toBeInTheDocument();
    expect(screen.getByText('Daftar Kapital Perusahaan')).toBeInTheDocument();

    const perusahaanCard = screen.getByTestId('horizontal-menu-card-PERUSAHAAN');
    fireEvent.click(perusahaanCard);
    expect(perusahaanCard).toHaveAttribute('aria-pressed', 'true');

    const modal = await screen.findByTestId('perusahaan-crud-modal');
    expect(modal).toBeInTheDocument();
    await waitFor(() => {
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByLabelText('Nama Stakeholder')
    ).not.toBeInTheDocument();

    // Create company with Nama Perusahaan and Seri (requires confirmation dialog)
    const nameInput = screen.getByLabelText('Nama Perusahaan');
    const seriesInput = screen.getByLabelText('Seri');
    fireEvent.change(nameInput, { target: { value: 'PT. Pangan Nusantara' } });
    fireEvent.change(seriesInput, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(apiClient.createCompany).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createCompany).toHaveBeenCalledWith({
        name: 'PT. Pangan Nusantara',
        series: 2,
      });
      expect(screen.getByText('PT. Pangan Nusantara')).toBeInTheDocument();
      expect(screen.getByTestId('series-tab-1')).toHaveTextContent('Seri 1');
      expect(screen.getByTestId('series-tab-2')).toHaveTextContent('Seri 2');
    });

    // Update company (requires confirmation dialog)
    fireEvent.click(screen.getByTestId('edit-row-2'));
    fireEvent.change(nameInput, {
      target: { value: 'PT. Pangan Nusantara Baru' },
    });
    fireEvent.change(seriesInput, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));
    expect(apiClient.updateCompany).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateCompany).toHaveBeenCalledWith(2, {
        name: 'PT. Pangan Nusantara Baru',
        series: 2,
      });
      expect(screen.getByText('PT. Pangan Nusantara Baru')).toBeInTheDocument();
    });

    // Delete company (requires confirmation dialog)
    fireEvent.click(screen.getByTestId('delete-row-2'));
    expect(apiClient.deleteCompany).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.deleteCompany).toHaveBeenCalledWith(2);
      expect(
        screen.queryByText('PT. Pangan Nusantara Baru')
      ).not.toBeInTheDocument();
    });

    // Click "Input Pemegang Saham" button on company row 1 to open stakeholder modal
    const stakeholderBtn = screen.getByTestId('stakeholder-row-1');
    expect(stakeholderBtn).toHaveTextContent('Input Pemegang Saham');
    fireEvent.click(stakeholderBtn);

    const stakeholderModal = await screen.findByTestId(
      'pemegang-saham-crud-modal'
    );
    expect(stakeholderModal).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Rian')).toBeInTheDocument();
    });

    const stakeholderNameInput = screen.getByLabelText('Nama Pemegang Saham');
    const stakeholderCapitalInput = screen.getByLabelText('Kapital (Rp)');
    fireEvent.change(stakeholderNameInput, {
      target: { value: 'Budi Santoso' },
    });
    fireEvent.change(stakeholderCapitalInput, {
      target: { value: '300000000.5' },
    });
    const submitButtons = screen.getAllByRole('button', { name: 'Tambah' });
    fireEvent.click(submitButtons[submitButtons.length - 1]);
    expect(apiClient.createCapitalCompany).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createCapitalCompany).toHaveBeenCalledWith({
        company_id: 1,
        stakeholder_name: 'Budi Santoso',
        capital: 300000000.5,
      });
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(
        screen.getByTestId('total-kapital-pemegang-saham-banner-value')
      ).toHaveTextContent('Rp 400.000.000,5');
    });

    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-INPUT_OPERASIONAL')
    );
    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_MODAL')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('perusahaan-crud-modal')
    ).not.toBeInTheDocument();
  });

  it('opens Daftar Kapital Perusahaan modal as a read-only DataTable and opens Detail Pemegang Saham modal on Detail click', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [
        DEFAULT_CFO_MODULE,
        DEFAULT_CHO_MODULE,
        DEFAULT_CPO_MODULE,
        DEFAULT_CDO_MODULE,
        DEFAULT_CMO_MODULE,
      ],
      meta: { count: 5 },
    });
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'PT. Slaras Nusa Foodlab',
        },
        {
          id: 2,
          name: 'PT. Pangan Nusantara',
        },
      ],
      meta: { count: 2 },
    });
    vi.mocked(apiClient.fetchCapitalCompanies).mockResolvedValue({
      data: [
        {
          id: 10,
          company_id: 1,
          stakeholder_name: 'Rian',
          capital: 100000000,
          company: {
            id: 1,
            name: 'PT. Slaras Nusa Foodlab',
          },
        },
        {
          id: 11,
          company_id: 1,
          stakeholder_name: 'Budi Santoso',
          capital: 300000000.5,
          company: {
            id: 1,
            name: 'PT. Slaras Nusa Foodlab',
          },
        },
        {
          id: 12,
          company_id: 2,
          stakeholder_name: 'Siti Aminah',
          capital: 500000000.75,
          company: {
            id: 2,
            name: 'PT. Pangan Nusantara',
          },
        },
      ],
      meta: { count: 3 },
    });

    render(<App />);

    await waitFor(() => {
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CFO'));
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_MODAL'));
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-DAFTAR_KAPITAL_PERUSAHAAN')
    );

    const modal = await screen.findByTestId(
      'daftar-kapital-perusahaan-crud-modal'
    );
    expect(modal).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClient.fetchCapitalCompanies).toHaveBeenCalledTimes(1);
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });

    // No input form, no Total Kapital Seluruh Perusahaan banner, and no Porsi Kapital (%) column
    expect(screen.queryByLabelText('Perusahaan')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Nama Pemegang Saham')
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kapital (Rp)')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Tambah' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('total-kapital-perusahaan-banner')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Porsi Kapital (%)')).not.toBeInTheDocument();

    // Grouped per company with comma-separated stakeholders and summed capital
    expect(screen.getByText('Rian, Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Rp 400.000.000,50')).toBeInTheDocument();
    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    expect(screen.getByText('Rp 500.000.000,75')).toBeInTheDocument();

    // Only "Detail" button in Aksi column (no Edit or Hapus)
    const detailBtn1 = screen.getByTestId('detail-row-1');
    expect(detailBtn1).toHaveTextContent('Detail');
    expect(screen.queryByTestId('edit-row-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-row-1')).not.toBeInTheDocument();

    // Click Detail to open read-only stakeholder modal for company 1
    fireEvent.click(detailBtn1);

    const detailModal = await screen.findByTestId(
      'detail-pemegang-saham-modal'
    );
    expect(detailModal).toBeInTheDocument();
    expect(screen.getByText('Detail Pemegang Saham')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByTestId('total-kapital-detail-pemegang-saham-banner-value')
      ).toHaveTextContent('Rp 400.000.000,50');
      expect(screen.getByText('Rian')).toBeInTheDocument();
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
      expect(screen.getByText('25,00%')).toBeInTheDocument();
      expect(screen.getByText('75,00%')).toBeInTheDocument();
    });

    // Read-only detail modal has no form and no Edit/Hapus buttons
    expect(
      screen.queryByRole('button', { name: 'Tambah' })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-row-10')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-row-10')).not.toBeInTheDocument();
  });

  it('hydrates directly from Inertia server props without calling fetchErpModules and keeps ModuleCards hidden until company tab is clicked', () => {
    render(
      <App
        modules={[
          DEFAULT_CFO_MODULE,
          DEFAULT_CHO_MODULE,
          DEFAULT_CPO_MODULE,
          DEFAULT_CDO_MODULE,
          DEFAULT_CMO_MODULE,
        ]}
        companies={[
          { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
          { id: 2, name: 'PT. Pangan Nusantara', series: 2 },
        ]}
        capitalCompanies={[
          {
            id: 10,
            company_id: 1,
            stakeholder_name: 'Rian',
            capital: 250000000,
          },
        ]}
      />
    );

    expect(screen.getByText('PT. Slaras Nusa Foodlab')).toBeInTheDocument();
    expect(apiClient.fetchErpModules).not.toHaveBeenCalled();

    // ModuleCards hidden by default
    expect(screen.queryByTestId('module-card-CFO')).not.toBeInTheDocument();
    expect(screen.getByTestId('company-tab-1')).toHaveAttribute(
      'aria-selected',
      'false'
    );

    // Clicking secondary company tab reveals ModuleCards
    fireEvent.click(screen.getByTestId('company-tab-1'));
    expect(screen.getByTestId('company-tab-1')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('module-card-CFO')).toBeInTheDocument();
    expect(screen.getByTestId('module-card-CMO')).toBeInTheDocument();

    // Switching primary series tab hides ModuleCards until a company in that series is clicked
    fireEvent.click(screen.getByTestId('series-tab-2'));
    expect(screen.queryByTestId('module-card-CFO')).not.toBeInTheDocument();
    const companyTab2 = screen.getByTestId('company-tab-2');
    expect(companyTab2).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(companyTab2);
    expect(companyTab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('module-card-CFO')).toBeInTheDocument();
  });
});
