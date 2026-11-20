import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as apiClient from '../api/client';
import { DEFAULT_CDO_MODULE } from '../modules/CDO/CdoModuleCard';
import { DEFAULT_CFO_MODULE } from '../modules/CFO/CfoModuleCard';
import { DEFAULT_CHO_MODULE } from '../modules/CHO/ChoModuleCard';
import { DEFAULT_CMO_MODULE } from '../modules/CMO/CmoModuleCard';
import { DEFAULT_CPO_MODULE } from '../modules/CPO/CpoModuleCard';

vi.mock('../api/client');

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/dashboard-flow-simulator']}>
      <App />
    </MemoryRouter>
  );
}

describe('CFO CompanyAsset (Input Aset)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('expands Input Aset into Master Aset and View Aset, supports asset CRUD, and shows a read-only asset summary', async () => {
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

    const companiesStore: apiClient.Company[] = [
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
      { id: 2, name: 'PT. Pangan Nusantara', series: 1 },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    let assetsStore: apiClient.CompanyAsset[] = [
      {
        id: 40,
        company_id: 1,
        asset_date: '2026-11-18',
        name: 'Sentrifus Laboratorium',
        amount: 1,
        price_per_unit: 5000000,
        total_price: 5000000,
        company: companiesStore[0],
      },
      {
        id: 41,
        company_id: 2,
        asset_date: '2026-11-19',
        name: 'Inkubator BOD',
        amount: 2,
        price_per_unit: 15000000,
        total_price: 30000000,
        company: companiesStore[1],
      },
    ];

    vi.mocked(apiClient.fetchCompanyAssets).mockImplementation(async () => ({
      data: [...assetsStore],
      meta: { count: assetsStore.length },
    }));
    vi.mocked(apiClient.createCompanyAsset).mockImplementation(
      async (payload) => {
        const created: apiClient.CompanyAsset = {
          id: 42,
          company_id: payload.company_id,
          asset_date: payload.asset_date,
          name: payload.name,
          amount: payload.amount,
          price_per_unit: payload.price_per_unit,
          total_price: payload.amount * payload.price_per_unit,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
        };
        assetsStore = [created, ...assetsStore];
        return { data: created };
      }
    );
    vi.mocked(apiClient.updateCompanyAsset).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.CompanyAsset = {
          id,
          company_id: payload.company_id,
          asset_date: payload.asset_date,
          name: payload.name,
          amount: payload.amount,
          price_per_unit: payload.price_per_unit,
          total_price: payload.amount * payload.price_per_unit,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
        };
        assetsStore = assetsStore.map((item) =>
          item.id === id ? updated : item
        );
        return { data: updated };
      }
    );
    vi.mocked(apiClient.deleteCompanyAsset).mockImplementation(async (id) => {
      assetsStore = assetsStore.filter((item) => item.id !== id);
      return { message: 'Company asset deleted successfully.' };
    });

    renderApp();

    await waitFor(() => {
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CFO'));
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_ASET'));

    expect(
      screen.getByTestId('horizontal-submenu-INPUT_ASET')
    ).toBeInTheDocument();
    expect(screen.getByText('Master Aset')).toBeInTheDocument();
    expect(screen.getByText('View Aset')).toBeInTheDocument();

    // Master Aset: full CRUD table for company assets.
    fireEvent.click(screen.getByTestId('horizontal-menu-card-MASTER_ASET'));
    const masterModal = await screen.findByTestId('company-asset-crud-modal');
    expect(masterModal).toBeInTheDocument();

    // Master Aset keeps every CRUD input (and the submit button) on one row.
    expect(masterModal).toHaveClass('max-w-7xl');
    const masterAssetForm = screen.getByTestId(
      'company-asset-crud-modal-form'
    );
    expect(masterAssetForm).toHaveClass('flex', 'flex-wrap', 'items-end');
    expect(masterAssetForm).not.toHaveClass('grid');
    expect(
      masterAssetForm.querySelectorAll(':scope > div.flex-1')
    ).toHaveLength(5);

    await waitFor(() => {
      expect(apiClient.fetchCompanyAssets).toHaveBeenCalled();
      expect(screen.getByText('Sentrifus Laboratorium')).toBeInTheDocument();
      expect(screen.getByText('Inkubator BOD')).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('company-asset-total-banner-value')
    ).toHaveTextContent('Rp 35.000.000');

    const assetCompanySelect = screen.getByLabelText(
      'Pilih Perusahaan'
    ) as HTMLSelectElement;
    expect(assetCompanySelect.value).toBe('1');
    expect(
      (screen.getByLabelText('Tanggal Aset') as HTMLInputElement).type
    ).toBe('date');

    // Create asset (requires confirmation dialog).
    fireEvent.change(assetCompanySelect, { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Tanggal Aset'), {
      target: { value: '2026-11-20' },
    });
    fireEvent.change(screen.getByLabelText('Nama Aset'), {
      target: { value: 'Freezer Laboratorium' },
    });
    fireEvent.change(screen.getByLabelText('Jumlah'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Harga Satuan'), {
      target: { value: '75000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(apiClient.createCompanyAsset).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createCompanyAsset).toHaveBeenCalledWith({
        company_id: 1,
        asset_date: '2026-11-20',
        name: 'Freezer Laboratorium',
        amount: 2,
        price_per_unit: 75000000,
      });
      expect(screen.getByText('Freezer Laboratorium')).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('company-asset-total-banner-value')
    ).toHaveTextContent('Rp 185.000.000');

    // Update asset (requires confirmation dialog).
    fireEvent.click(screen.getByTestId('edit-row-42'));
    fireEvent.change(screen.getByLabelText('Nama Aset'), {
      target: { value: 'Freezer Laboratorium -86C' },
    });
    fireEvent.change(screen.getByLabelText('Jumlah'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('Harga Satuan'), {
      target: { value: '76000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateCompanyAsset).toHaveBeenCalledWith(42, {
        company_id: 1,
        asset_date: '2026-11-20',
        name: 'Freezer Laboratorium -86C',
        amount: 3,
        price_per_unit: 76000000,
      });
      expect(
        screen.getByText('Freezer Laboratorium -86C')
      ).toBeInTheDocument();
    });

    // Delete asset (soft-deleted on the API, removed from the table here).
    fireEvent.click(screen.getByTestId('delete-row-42'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteCompanyAsset).toHaveBeenCalledWith(42);
      expect(
        screen.queryByText('Freezer Laboratorium -86C')
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tutup Modal' }));
    expect(
      screen.queryByTestId('company-asset-crud-modal')
    ).not.toBeInTheDocument();

    // View Aset: read-only register of the active company's assets.
    fireEvent.click(screen.getByTestId('horizontal-menu-card-VIEW_ASET'));
    const viewModal = await screen.findByTestId('view-aset-modal');
    expect(viewModal).toBeInTheDocument();

    await waitFor(() => {
      expect(
        within(viewModal).getByText('Sentrifus Laboratorium')
      ).toBeInTheDocument();
      expect(
        within(viewModal).queryByText('Inkubator BOD')
      ).not.toBeInTheDocument();
    });
    expect(
      within(viewModal).getByTestId('view-aset-total-banner-value')
    ).toHaveTextContent('Rp 5.000.000');
    expect(
      within(viewModal).queryByRole('button', { name: 'Tambah' })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-row-40')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-row-40')).not.toBeInTheDocument();

    fireEvent.click(
      within(viewModal).getByRole('button', { name: 'Tutup Modal' })
    );
    expect(screen.queryByTestId('view-aset-modal')).not.toBeInTheDocument();

    // Switching the active company scopes the View Aset register.
    fireEvent.click(screen.getByTestId('company-tab-2'));
    fireEvent.click(screen.getByTestId('module-card-CFO'));
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_ASET'));
    fireEvent.click(screen.getByTestId('horizontal-menu-card-VIEW_ASET'));

    const secondViewModal = await screen.findByTestId('view-aset-modal');
    await waitFor(() => {
      expect(
        within(secondViewModal).getByText('Inkubator BOD')
      ).toBeInTheDocument();
      expect(
        within(secondViewModal).queryByText('Sentrifus Laboratorium')
      ).not.toBeInTheDocument();
    });
    expect(
      within(secondViewModal).getByTestId('view-aset-total-banner-value')
    ).toHaveTextContent('Rp 30.000.000');
  });
});
