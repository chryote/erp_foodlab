import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import * as apiClient from '../api/client';
import { DEFAULT_CFO_MODULE } from '../modules/CFO/CfoModuleCard';
import { DEFAULT_CHO_MODULE } from '../modules/CHO/ChoModuleCard';
import { DEFAULT_CPO_MODULE } from '../modules/CPO/CpoModuleCard';
import { DEFAULT_CDO_MODULE } from '../modules/CDO/CdoModuleCard';
import { DEFAULT_CMO_MODULE } from '../modules/CMO/CmoModuleCard';
import { formatCurrentMonthDateRange } from '../modules/CFO/ViewOperasionalModal';

vi.mock('../api/client');

const CurrentPath = () => {
  const { pathname } = useLocation();
  return <output data-testid="current-path">{pathname}</output>;
};

const renderApp = (initialPath = '/dashboard-flow-simulator') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );

describe('App ERP Main Menu integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('loads a menu placeholder when opened through its direct route', async () => {
    vi.mocked(apiClient.fetchCurrentUser).mockResolvedValue({
      data: {
        id: 1,
        name: 'ERP Administrator',
        email: 'admin@foodlab.test',
      },
    });
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [{ id: 21, name: 'FoodLab Route Company', series: 1 }],
      meta: { count: 1 },
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

    renderApp('/dashboard/company/21/menu/CHO/INPUT_SDM/master-karyawan');

    expect(await screen.findByText('Master Karyawan')).toBeInTheDocument();
    expect(await screen.findByTestId('dashboard-company-tab-21')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await waitFor(() => {
      expect(apiClient.syncActiveCompany).toHaveBeenCalledWith(21);
    });
  });

  it('redirects to the login page after logout', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard-flow-simulator']}>
        <CurrentPath />
        <App />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Keluar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, keluar' }));

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
    });
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
  });

  it('redirects to the root dashboard after successful login', async () => {
    window.localStorage.clear();
    vi.mocked(apiClient.login).mockResolvedValue({
      data: {
        user: { id: 1, name: 'ERP Administrator', email: 'admin@foodlab.test' },
        token: 'token-123',
        token_type: 'Bearer',
      },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <CurrentPath />
        <App />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@foodlab.test' },
    });
    fireEvent.change(screen.getByLabelText('Kata Sandi'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/$/);
    });
    expect(
      await screen.findByRole('img', { name: 'Dashboard Illustration' })
    ).toBeInTheDocument();
  });

  it('opens the flow simulator after login when development mode is enabled', async () => {
    window.localStorage.clear();
    vi.mocked(apiClient.login).mockResolvedValue({
      data: {
        user: { id: 1, name: 'ERP Administrator', email: 'admin@foodlab.test' },
        token: 'token-123',
        token_type: 'Bearer',
      },
    });
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <CurrentPath />
        <App />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@foodlab.test' },
    });
    fireEvent.change(screen.getByLabelText('Kata Sandi'), {
      target: { value: 'password' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: /Mode pengembangan/ })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent(
        /^\/dashboard-flow-simulator$/
      );
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Keluar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, keluar' }));
    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/login$/);
    });
    expect(window.localStorage.getItem('erp_foodlab.development_mode')).toBe(
      null
    );
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
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
    let companiesStore: apiClient.Company[] = [
      {
        id: 1,
        name: 'PT. Slaras Nusa Foodlab',
        series: 1,
      },
    ];
    let capitalStore: apiClient.CapitalCompany[] = [
      {
        id: 101,
        company_id: 1,
        stakeholder_name: 'Rian',
        capital: 100000000,
      },
    ];

    vi.mocked(apiClient.fetchCompanies).mockImplementation(async () => ({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    }));
    vi.mocked(apiClient.createCompany).mockImplementation(async (payload) => {
      const created: apiClient.Company = {
        id: 2,
        name: payload.name,
        series: payload.series ?? 1,
      };
      companiesStore = [created, ...companiesStore];
      return { data: created };
    });
    vi.mocked(apiClient.updateCompany).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.Company = {
          id,
          name: payload.name,
          series: payload.series ?? 1,
        };
        companiesStore = companiesStore.map((c) => (c.id === id ? updated : c));
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deleteCompany).mockImplementation(async (id) => {
      companiesStore = companiesStore.filter((c) => c.id !== id);
      return { message: 'Company deleted successfully.' };
    });
    vi.mocked(apiClient.fetchCapitalCompanies).mockImplementation(
      async () => ({
        data: [...capitalStore],
        meta: { count: capitalStore.length },
      })
    );
    vi.mocked(apiClient.createCapitalCompany).mockImplementation(
      async (payload) => {
        const created: apiClient.CapitalCompany = {
          id: 102,
          company_id: payload.company_id,
          stakeholder_name: payload.stakeholder_name,
          capital: payload.capital,
        };
        capitalStore = [created, ...capitalStore];
        return { data: created };
      }
    );

    renderApp();

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

    const companyTab1 = await screen.findByTestId('company-tab-1');
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
    expect(screen.getByText('Arus Kas')).toBeInTheDocument();
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
    expect(screen.getByText('Master Modal')).toBeInTheDocument();
    expect(screen.getByText('View Modal')).toBeInTheDocument();

    const perusahaanCard = screen.getByTestId('horizontal-menu-card-PERUSAHAAN');
    fireEvent.click(perusahaanCard);
    expect(perusahaanCard).toHaveAttribute('aria-pressed', 'true');

    const modal = await screen.findByTestId('perusahaan-crud-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('perusahaan-crud-modal-split-layout')
    ).toContainElement(screen.getByTestId('perusahaan-crud-modal-form-panel'));
    expect(
      screen.getByTestId('perusahaan-crud-modal-split-layout')
    ).toContainElement(screen.getByTestId('perusahaan-crud-modal-table-panel'));
    expect(screen.getByTestId('perusahaan-crud-modal-form')).toHaveClass(
      'flex-col'
    );
    expect(
      screen.getByTestId('perusahaan-crud-modal-name-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');
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
    expect(stakeholderModal).toHaveClass(
      'max-w-[95vw]',
      'h-[92vh]',
      'max-h-[92vh]'
    );
    expect(
      screen.getByTestId('pemegang-saham-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('pemegang-saham-crud-modal-form-panel')
    );
    expect(
      screen.getByTestId('pemegang-saham-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('pemegang-saham-crud-modal-table-panel')
    );
    expect(screen.getByTestId('pemegang-saham-crud-modal-form')).toHaveClass(
      'flex-col'
    );

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
      screen.getByTestId('horizontal-submenu-INPUT_OPERASIONAL')
    ).toBeInTheDocument();
    expect(screen.getByText('Master Operasional')).toBeInTheDocument();
    expect(screen.getByText('View Operasional')).toBeInTheDocument();
    expect(screen.getByText('Item Operasional')).toBeInTheDocument();
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

    renderApp();

    await waitFor(() => {
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CFO'));
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_MODAL'));
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-DAFTAR_KAPITAL_PERUSAHAAN')
    );

    const modal = await screen.findByTestId(
      'daftar-kapital-perusahaan-crud-modal'
    );
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('daftar-kapital-perusahaan-crud-modal-table-panel')
    ).toBeInTheDocument();

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
    expect(detailModal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('detail-pemegang-saham-modal-table-panel')
    ).toBeInTheDocument();
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

  it('loads dashboard via REST API and keeps ModuleCards hidden until company tab is clicked', async () => {
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
        { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
        { id: 2, name: 'PT. Pangan Nusantara', series: 2 },
      ],
      meta: { count: 2 },
    });

    renderApp();

    expect(screen.getByText('PT. Slaras Nusa Foodlab')).toBeInTheDocument();
    await waitFor(() => {
      expect(apiClient.fetchErpModules).toHaveBeenCalledTimes(1);
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });

    // ModuleCards hidden by default
    expect(screen.queryByTestId('module-card-CFO')).not.toBeInTheDocument();
    const companyTab1 = await screen.findByTestId('company-tab-1');
    expect(companyTab1).toHaveAttribute('aria-selected', 'false');

    // Clicking secondary company tab reveals ModuleCards
    fireEvent.click(companyTab1);
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

  it('opens Master Operasional modal with 3 primary tabs (Kategori, Tipe, Item) and performs CRUD on each tab scoped to active company_id', async () => {
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
        { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
        { id: 2, name: 'PT. Pangan Nusantara', series: 1 },
      ],
      meta: { count: 2 },
    });
    let categoriesStore: apiClient.ExpenseCategory[] = [
      { id: 10, company_id: 1, name: 'Bahan Baku' },
      { id: 12, company_id: 1, name: 'Lainnya' },
      { id: 13, company_id: 2, name: 'Kategori Perusahaan 2' },
    ];
    let typesStore: apiClient.ExpenseType[] = [
      { id: 20, company_id: 1, expense_category_id: 10, name: 'Dairy' },
      { id: 22, company_id: 1, expense_category_id: 12, name: 'Listrik' },
      {
        id: 23,
        company_id: 2,
        expense_category_id: 13,
        name: 'Tipe Perusahaan 2',
      },
    ];
    let itemsStore: apiClient.ExpenseItem[] = [
      {
        id: 30,
        expense_category_id: 10,
        expense_type_id: 20,
        company_id: 1,
        name: 'Susu Segar',
        amount: 1500000,
        purchased_on: '2026-11-18',
        detail: 'Stok susu pagi',
      },
      {
        id: 31,
        expense_category_id: 10,
        expense_type_id: 20,
        company_id: 2,
        name: 'Krim Kental',
        amount: 2500000,
        purchased_on: '2026-11-18',
        detail: 'Stok krim cabang 2',
      },
    ];

    vi.mocked(apiClient.fetchExpenseCategories).mockImplementation(
      async () => ({
        data: [...categoriesStore],
        meta: { count: categoriesStore.length },
      })
    );
    vi.mocked(apiClient.createExpenseCategory).mockImplementation(
      async (payload) => {
        const created: apiClient.ExpenseCategory = {
          id: 11,
          company_id: payload.company_id,
          name: payload.name,
        };
        categoriesStore = [created, ...categoriesStore];
        return { data: created };
      }
    );
    vi.mocked(apiClient.updateExpenseCategory).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.ExpenseCategory = {
          id,
          company_id: payload.company_id,
          name: payload.name,
        };
        categoriesStore = categoriesStore.map((c) =>
          c.id === id ? updated : c
        );
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deleteExpenseCategory).mockImplementation(
      async (id) => {
        categoriesStore = categoriesStore.filter((c) => c.id !== id);
        return { message: 'Expense category deleted successfully.' };
      }
    );
    vi.mocked(apiClient.fetchExpenseTypes).mockImplementation(async () => ({
      data: [...typesStore],
      meta: { count: typesStore.length },
    }));
    vi.mocked(apiClient.createExpenseType).mockImplementation(
      async (payload) => {
        const created: apiClient.ExpenseType = {
          id: 21,
          company_id: payload.company_id,
          expense_category_id: payload.expense_category_id,
          name: payload.name,
        };
        typesStore = [created, ...typesStore];
        return { data: created };
      }
    );
    vi.mocked(apiClient.updateExpenseType).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.ExpenseType = {
          id,
          company_id: payload.company_id,
          expense_category_id: payload.expense_category_id,
          name: payload.name,
        };
        typesStore = typesStore.map((t) => (t.id === id ? updated : t));
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deleteExpenseType).mockImplementation(async (id) => {
      typesStore = typesStore.filter((t) => t.id !== id);
      return { message: 'Expense type deleted successfully.' };
    });
    vi.mocked(apiClient.fetchExpenseItems).mockImplementation(async () => ({
      data: [...itemsStore],
      meta: { count: itemsStore.length },
    }));
    vi.mocked(apiClient.createExpenseItem).mockImplementation(
      async (payload) => {
        const created: apiClient.ExpenseItem = {
          id: 32,
          expense_category_id: payload.expense_category_id ?? 10,
          expense_type_id: payload.expense_type_id,
          company_id: payload.company_id,
          name: payload.name,
          amount: payload.amount,
          purchased_on: payload.purchased_on,
          detail: payload.detail ?? null,
        };
        itemsStore = [created, ...itemsStore];
        return { data: created };
      }
    );
    vi.mocked(apiClient.updateExpenseItem).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.ExpenseItem = {
          id,
          expense_category_id: payload.expense_category_id ?? 10,
          expense_type_id: payload.expense_type_id,
          company_id: payload.company_id,
          name: payload.name,
          amount: payload.amount,
          purchased_on: payload.purchased_on,
          detail: payload.detail ?? null,
        };
        itemsStore = itemsStore.map((item) => (item.id === id ? updated : item));
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deleteExpenseItem).mockImplementation(async (id) => {
      itemsStore = itemsStore.filter((item) => item.id !== id);
      return { message: 'Expense item deleted successfully.' };
    });

    renderApp();

    await waitFor(() => {
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });

    // Select active company tab 1 -> CFO -> Input Operasional -> Master Operasional
    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CFO'));
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-INPUT_OPERASIONAL')
    );
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-MASTER_OPERASIONAL')
    );

    const modal = await screen.findByTestId('master-operasional-crud-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('master-operasional-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-operasional-crud-modal-form-panel')
    );
    expect(
      screen.getByTestId('master-operasional-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-operasional-crud-modal-table-panel')
    );
    expect(screen.getByTestId('master-operasional-crud-modal-form')).toHaveClass(
      'flex-col'
    );
    expect(
      screen.getByTestId('master-operasional-crud-modal-company_id-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');

    // 2 primary tabs: Kategori, Tipe (Item tab removed)
    const tabKategori = screen.getByTestId('master-operasional-tab-kategori');
    const tabTipe = screen.getByTestId('master-operasional-tab-tipe');
    expect(tabKategori).toHaveTextContent('Kategori');
    expect(tabTipe).toHaveTextContent('Tipe');
    expect(
      screen.queryByTestId('master-operasional-tab-item')
    ).not.toBeInTheDocument();
    expect(tabKategori).toHaveAttribute('aria-selected', 'true');

    await waitFor(() => {
      expect(screen.getByText('Bahan Baku')).toBeInTheDocument();
      expect(screen.getByText('Kategori Perusahaan 2')).toBeInTheDocument();
    });

    const kategoriCompanySelect = screen.getByLabelText(
      'Pilih Perusahaan'
    ) as HTMLSelectElement;
    expect(kategoriCompanySelect.value).toBe('1');

    // CRUD on Tab 1: Kategori
    fireEvent.change(screen.getByLabelText('Nama Kategori'), {
      target: { value: 'Utilitas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.createExpenseCategory).toHaveBeenCalledWith({
        company_id: 1,
        name: 'Utilitas',
      });
      expect(screen.getByText('Utilitas')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-row-11'));
    fireEvent.change(screen.getByLabelText('Nama Kategori'), {
      target: { value: 'Utilitas Pabrik' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.updateExpenseCategory).toHaveBeenCalledWith(11, {
        company_id: 1,
        name: 'Utilitas Pabrik',
      });
      expect(screen.getByText('Utilitas Pabrik')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-row-11'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.deleteExpenseCategory).toHaveBeenCalledWith(11);
      expect(screen.queryByText('Utilitas Pabrik')).not.toBeInTheDocument();
    });

    // CRUD on Tab 2: Tipe
    fireEvent.click(tabTipe);
    expect(tabTipe).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByText('Tipe Perusahaan 2')).toBeInTheDocument();

    const tipeCompanySelect = screen.getByLabelText(
      'Pilih Perusahaan'
    ) as HTMLSelectElement;
    const tipeCategorySelect = screen.getByLabelText(
      'Pilih Kategori'
    ) as HTMLSelectElement;
    expect(tipeCompanySelect.value).toBe('1');
    expect(
      Array.from(tipeCategorySelect.options).map((opt) => opt.textContent)
    ).not.toContain('Kategori Perusahaan 2');

    // Switching company resets category and filters categories to company 2
    fireEvent.change(tipeCompanySelect, { target: { value: '2' } });
    expect(
      Array.from(tipeCategorySelect.options).map((opt) => opt.textContent)
    ).toContain('Kategori Perusahaan 2');
    fireEvent.change(tipeCompanySelect, { target: { value: '1' } });

    fireEvent.change(tipeCategorySelect, {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('Nama Tipe'), {
      target: { value: 'Kemasan' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.createExpenseType).toHaveBeenCalledWith({
        company_id: 1,
        expense_category_id: 10,
        name: 'Kemasan',
      });
      expect(screen.getByText('Kemasan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-row-21'));
    fireEvent.change(screen.getByLabelText('Nama Tipe'), {
      target: { value: 'Kemasan Botol' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.updateExpenseType).toHaveBeenCalledWith(21, {
        company_id: 1,
        expense_category_id: 10,
        name: 'Kemasan Botol',
      });
      expect(screen.getByText('Kemasan Botol')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-row-21'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.deleteExpenseType).toHaveBeenCalledWith(21);
      expect(screen.queryByText('Kemasan Botol')).not.toBeInTheDocument();
    });

    // Close Master Operasional modal and open independent Item Operasional card beside View Operasional
    fireEvent.click(screen.getByRole('button', { name: 'Tutup Modal' }));
    expect(
      screen.queryByTestId('master-operasional-crud-modal')
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-ITEM_OPERASIONAL')
    );
    const itemModal = await screen.findByTestId('expense-item-crud-modal');
    expect(itemModal).toBeInTheDocument();
    expect(itemModal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('expense-item-crud-modal-split-layout')
    ).toContainElement(screen.getByTestId('expense-item-crud-modal-form-panel'));
    expect(
      screen.getByTestId('expense-item-crud-modal-split-layout')
    ).toContainElement(screen.getByTestId('expense-item-crud-modal-table-panel'));
    expect(screen.getByTestId('expense-item-crud-modal-form')).toHaveClass(
      'flex-col'
    );
    expect(
      screen.getByTestId('expense-item-crud-modal-company_id-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');
    expect(
      screen.queryByRole('columnheader', { name: 'Pilih Perusahaan' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Susu Segar')).toBeInTheDocument();
    expect(screen.getByText('Krim Kental')).toBeInTheDocument();
    expect(screen.getByText('Stok susu pagi')).toBeInTheDocument();

    const itemCompanySelect = screen.getByLabelText(
      'Pilih Perusahaan'
    ) as HTMLSelectElement;
    const itemCategorySelect = screen.getByLabelText(
      'Pilih Kategori'
    ) as HTMLSelectElement;
    const itemTypeSelect = screen.getByLabelText(
      'Pilih Tipe'
    ) as HTMLSelectElement;
    const itemDateInput = screen.getByLabelText(
      'Tanggal Transaksi'
    ) as HTMLInputElement;
    expect(itemCompanySelect.value).toBe('1');
    expect(itemDateInput.type).toBe('date');
    expect(fireEvent.keyDown(itemDateInput, { key: '1' })).toBe(false);
    expect(fireEvent.keyDown(itemDateInput, { key: 'Tab' })).toBe(true);
    expect(itemTypeSelect).toBeDisabled();

    // Switching company updates category options and clears category & type
    fireEvent.change(itemCompanySelect, { target: { value: '2' } });
    expect(
      Array.from(itemCategorySelect.options).map((opt) => opt.textContent)
    ).toContain('Kategori Perusahaan 2');
    fireEvent.change(itemCompanySelect, { target: { value: '1' } });
    expect(itemCategorySelect.value).toBe('');
    expect(itemTypeSelect.value).toBe('');

    fireEvent.change(itemCategorySelect, {
      target: { value: '10' },
    });
    expect(itemTypeSelect).not.toBeDisabled();
    const typeOptionLabels = Array.from(itemTypeSelect.options).map(
      (opt) => opt.textContent
    );
    expect(typeOptionLabels).toContain('Dairy');
    expect(typeOptionLabels).not.toContain('Listrik');

    fireEvent.change(itemTypeSelect, {
      target: { value: '20' },
    });
    expect(itemTypeSelect.value).toBe('20');

    // Switching parent category clears selected tipe and updates filtered options
    fireEvent.change(itemCategorySelect, {
      target: { value: '12' },
    });
    expect(itemTypeSelect.value).toBe('');
    expect(
      Array.from(itemTypeSelect.options).map((opt) => opt.textContent)
    ).toContain('Listrik');

    fireEvent.change(itemCategorySelect, {
      target: { value: '10' },
    });
    fireEvent.change(itemTypeSelect, {
      target: { value: '20' },
    });
    fireEvent.change(itemDateInput, {
      target: { value: '2026-11-19' },
    });
    fireEvent.change(screen.getByLabelText('Nama Item'), {
      target: { value: 'Keju Mozzarella' },
    });
    fireEvent.change(screen.getByLabelText('Nominal'), {
      target: { value: '3250000' },
    });
    const detailInput = screen.getByLabelText('Keterangan');
    expect(detailInput.tagName).toBe('TEXTAREA');
    fireEvent.change(detailInput, {
      target: { value: 'Pembelian bahan pizza' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.createExpenseItem).toHaveBeenCalledWith({
        expense_category_id: 10,
        expense_type_id: 20,
        company_id: 1,
        purchased_on: '2026-11-19',
        name: 'Keju Mozzarella',
        amount: 3250000,
        detail: 'Pembelian bahan pizza',
      });
      expect(screen.getByText('Keju Mozzarella')).toBeInTheDocument();
      expect(screen.getByText('Pembelian bahan pizza')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('edit-row-32'));
    fireEvent.change(itemDateInput, {
      target: { value: '2026-11-20' },
    });
    fireEvent.change(screen.getByLabelText('Nama Item'), {
      target: { value: 'Keju Cheddar' },
    });
    fireEvent.change(screen.getByLabelText('Nominal'), {
      target: { value: '3500000' },
    });
    fireEvent.change(screen.getByLabelText('Keterangan'), {
      target: { value: 'Update bahan keju' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.updateExpenseItem).toHaveBeenCalledWith(32, {
        expense_category_id: 10,
        expense_type_id: 20,
        company_id: 1,
        purchased_on: '2026-11-20',
        name: 'Keju Cheddar',
        amount: 3500000,
        detail: 'Update bahan keju',
      });
      expect(screen.getByText('Keju Cheddar')).toBeInTheDocument();
      expect(screen.getByText('Update bahan keju')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-row-32'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.deleteExpenseItem).toHaveBeenCalledWith(32);
      expect(screen.queryByText('Keju Cheddar')).not.toBeInTheDocument();
    });
  });

  it('opens View Operasional modal with current month date range and expense amounts grouped by category and type', async () => {
    const now = new Date();
    const currentMonthIso = new Date(
      now.getFullYear(),
      now.getMonth(),
      15,
      10,
      0,
      0
    ).toISOString();
    const previousMonthIso = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      15,
      10,
      0,
      0
    ).toISOString();

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
        { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
        { id: 2, name: 'PT. Pangan Nusantara', series: 1 },
      ],
      meta: { count: 2 },
    });
    vi.mocked(apiClient.fetchExpenseCategories).mockResolvedValue({
      data: [
        { id: 10, company_id: 1, name: 'Bahan Baku' },
        { id: 11, company_id: 1, name: 'Utilitas' },
        { id: 12, company_id: 2, name: 'Operasional Cabang 2' },
      ],
      meta: { count: 3 },
    });
    vi.mocked(apiClient.fetchExpenseTypes).mockResolvedValue({
      data: [
        { id: 20, company_id: 1, expense_category_id: 10, name: 'Dairy' },
        { id: 21, company_id: 1, expense_category_id: 10, name: 'Kemasan' },
        { id: 22, company_id: 1, expense_category_id: 11, name: 'Listrik' },
        { id: 23, company_id: 2, expense_category_id: 12, name: 'Sewa' },
      ],
      meta: { count: 4 },
    });
    vi.mocked(apiClient.fetchExpenseItems).mockResolvedValue({
      data: [
        {
          id: 30,
          expense_category_id: 10,
          expense_type_id: 20,
          company_id: 1,
          name: 'Susu Segar',
          amount: 1500000,
          created_at: currentMonthIso,
        },
        {
          id: 31,
          expense_category_id: 10,
          expense_type_id: 20,
          company_id: 1,
          name: 'Mentega',
          amount: 500000,
          created_at: currentMonthIso,
        },
        {
          id: 32,
          expense_category_id: 10,
          expense_type_id: 21,
          company_id: 1,
          name: 'Botol Kaca',
          amount: 300000,
          created_at: currentMonthIso,
        },
        {
          id: 33,
          expense_category_id: 12,
          expense_type_id: 23,
          company_id: 2,
          name: 'Sewa Gudang',
          amount: 9000000,
          created_at: currentMonthIso,
        },
        {
          id: 34,
          expense_category_id: 11,
          expense_type_id: 22,
          company_id: 1,
          name: 'Listrik Bulan Lalu',
          amount: 750000,
          created_at: previousMonthIso,
        },
      ],
      meta: { count: 5 },
    });

    renderApp();

    await waitFor(() => {
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CFO'));
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-INPUT_OPERASIONAL')
    );
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-VIEW_OPERASIONAL')
    );

    const modal = await screen.findByTestId('view-operasional-modal');
    expect(modal).toBeInTheDocument();

    expect(
      screen.getByTestId('view-operasional-date-range')
    ).toHaveTextContent(formatCurrentMonthDateRange(now));

    await waitFor(() => {
      expect(
        screen.getByTestId('view-operasional-category-amount-10')
      ).toHaveTextContent('2.3');
      expect(
        screen.getByTestId('view-operasional-type-amount-20')
      ).toHaveTextContent('2');
      expect(
        screen.getByTestId('view-operasional-type-amount-21')
      ).toHaveTextContent('0.3');
      expect(
        screen.getByTestId('view-operasional-category-amount-11')
      ).toHaveTextContent('0');
      expect(
        screen.getByTestId('view-operasional-type-amount-22')
      ).toHaveTextContent('0');
      expect(
        screen.queryByTestId('view-operasional-category-12')
      ).not.toBeInTheDocument();
    });

    // Clicking category amount opens ExpenseItem detail per item for that category
    fireEvent.click(
      screen.getByTestId('view-operasional-category-amount-10')
    );
    const detailModal = await screen.findByTestId(
      'view-operasional-detail-modal'
    );
    expect(detailModal).toBeInTheDocument();
    expect(detailModal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('view-operasional-detail-modal-table-panel')
    ).toBeInTheDocument();
    expect(screen.getByText('Susu Segar')).toBeInTheDocument();
    expect(screen.getByText('Mentega')).toBeInTheDocument();
    expect(screen.getByText('Botol Kaca')).toBeInTheDocument();
    expect(screen.queryByText('Sewa Gudang')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('view-operasional-detail-summary-value')
    ).toHaveTextContent('Rp 2.300.000 (2.3)');

    // Close detail modal and click type amount to drill down to a specific type
    const closeButtons = screen.getAllByRole('button', {
      name: 'Tutup Modal',
    });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(
      screen.queryByTestId('view-operasional-detail-modal')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('view-operasional-type-amount-20'));
    expect(
      await screen.findByTestId('view-operasional-detail-modal')
    ).toBeInTheDocument();
    expect(screen.getByText('Susu Segar')).toBeInTheDocument();
    expect(screen.getByText('Mentega')).toBeInTheDocument();
    expect(screen.queryByText('Botol Kaca')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('view-operasional-detail-summary-value')
    ).toHaveTextContent('Rp 2.000.000 (2)');

    const closeButtonsAfterType = screen.getAllByRole('button', {
      name: 'Tutup Modal',
    });
    fireEvent.click(
      closeButtonsAfterType[closeButtonsAfterType.length - 1]
    );
    expect(
      screen.queryByTestId('view-operasional-detail-modal')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tutup Modal' }));
    expect(
      screen.queryByTestId('view-operasional-modal')
    ).not.toBeInTheDocument();

    // Switching active company on header secondary tab loads that company's View Operasional data
    fireEvent.click(screen.getByTestId('company-tab-2'));
    fireEvent.click(screen.getByTestId('module-card-CFO'));
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-INPUT_OPERASIONAL')
    );
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-VIEW_OPERASIONAL')
    );

    expect(
      await screen.findByTestId('view-operasional-modal')
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByTestId('view-operasional-category-10')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('view-operasional-category-amount-12')
      ).toHaveTextContent('9');
      expect(
        screen.getByTestId('view-operasional-type-amount-23')
      ).toHaveTextContent('9');
    });
  });

  it('redirects unauthenticated visitors on /dashboard-flow-simulator to /login and returns them after login', async () => {
    window.localStorage.clear();
    vi.mocked(apiClient.login).mockResolvedValue({
      data: {
        user: {
          id: 1,
          name: 'ERP Administrator',
          email: 'admin@foodlab.test',
        },
        token: 'lan-token-123',
        token_type: 'Bearer',
      },
    });
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [DEFAULT_CFO_MODULE],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [{ id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 }],
      meta: { count: 1 },
    });

    renderApp();

    expect(await screen.findByTestId('login-form')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@foodlab.test' },
    });
    fireEvent.change(screen.getByLabelText('Kata Sandi'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(
      await screen.findByText('PT. Slaras Nusa Foodlab')
    ).toBeInTheDocument();
  });
});
