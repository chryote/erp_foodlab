import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '@/api/client';
import type { CompanyAsset } from '@/api/client';
import CfoMasterAsetPage from '@/pages/menu/CFO/INPUT_ASET/master-aset';
import CfoViewAsetPage from '@/pages/menu/CFO/INPUT_ASET/view-aset';

vi.mock('@/api/client');

const company = { id: 21, name: 'FoodLab', series: 1 };
const assets: CompanyAsset[] = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  company_id: 21,
  asset_date: `2026-11-${String(index + 1).padStart(2, '0')}`,
  name: `Asset ${index + 1}`,
  amount: index === 24 ? 1000 : index + 1,
  price_per_unit: 1000,
  total_price: (index + 1) * 1000,
}));

function renderPage(path: string, page: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/company/:companyId"
            element={page}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function mockAssetList() {
  vi.mocked(apiClient.fetchCompanyAssets).mockImplementation(
    async (params) => {
      let matching = assets.filter(
        (asset) =>
          params?.company_id === undefined ||
          asset.company_id === params.company_id
      );
      if (params?.search) {
        matching = matching.filter((asset) =>
          asset.name.toLowerCase().includes(params.search!.toLowerCase())
        );
      }
      if (params?.sort === 'name,-id') {
        matching = [...matching].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      } else {
        matching = [...matching].sort((a, b) =>
          b.asset_date.localeCompare(a.asset_date)
        );
      }

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
}

describe('CFO asset pages', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [company],
      meta: { count: 1 },
    });
    mockAssetList();
  });

  it('loads the selected company assets incrementally and sends server-side search and sort', async () => {
    renderPage('/company/21', <CfoViewAsetPage />);

    expect(await screen.findByText('Asset 25')).toBeInTheDocument();
    expect(apiClient.fetchCompanyAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 21,
        page: 1,
        per_page: 10,
        sort: '-asset_date,-id',
      })
    );

    const scrollContainer = screen.getByTestId('view-aset-table-scroll');
    Object.defineProperties(scrollContainer, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, writable: true, value: 600 },
    });
    fireEvent.scroll(scrollContainer);
    expect(await screen.findByText('Asset 15')).toBeInTheDocument();
    expect(apiClient.fetchCompanyAssets).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 21, page: 2, per_page: 10 })
    );

    fireEvent.change(screen.getByTestId('view-aset-search'), {
      target: { value: 'Asset 2' },
    });
    await waitFor(
      () =>
        expect(apiClient.fetchCompanyAssets).toHaveBeenCalledWith(
          expect.objectContaining({
            company_id: 21,
            search: 'Asset 2',
            page: 1,
          })
        ),
      { timeout: 2000 }
    );
    expect(await screen.findByText('Asset 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Nama Aset' }));
    await waitFor(() =>
      expect(apiClient.fetchCompanyAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 21,
          search: 'Asset 2',
          sort: 'name,-id',
        })
      )
    );
  });

  it('keeps master assets unpaginated in the UI and uses the API sort fields', async () => {
    renderPage('/company/21', <CfoMasterAsetPage />);

    expect(await screen.findByText('Asset 25')).toBeInTheDocument();
    expect(screen.getByText('1.000')).toBeInTheDocument();
    expect(screen.queryByTestId('master-aset-pagination')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Urutkan Harga Satuan' }));
    await waitFor(() =>
      expect(apiClient.fetchCompanyAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          per_page: 10,
          sort: 'price_per_unit,-id',
        })
      )
    );
  });

  it('keeps the master asset search visible while search results load', async () => {
    const fetchAssets = vi.mocked(apiClient.fetchCompanyAssets).getMockImplementation();
    let releaseSearch: (() => void) | undefined;
    vi.mocked(apiClient.fetchCompanyAssets).mockImplementation(async (params) => {
      if (params?.search) {
        await new Promise<void>((resolve) => {
          releaseSearch = resolve;
        });
      }
      return fetchAssets!(params);
    });

    renderPage('/company/21', <CfoMasterAsetPage />);
    await screen.findByText('Asset 25');

    const search = screen.getByTestId('master-aset-search');
    fireEvent.change(search, { target: { value: 'Asset 2' } });

    expect(await screen.findByText('Memuat data aset...')).toBeInTheDocument();
    expect(screen.getByTestId('master-aset-search')).toBeInTheDocument();
    expect(search).toHaveValue('Asset 2');

    const finishSearch = await waitFor(() => {
      if (!releaseSearch) {
        throw new Error('The search request did not start.');
      }
      return releaseSearch;
    });
    finishSearch();
    expect(await screen.findByText('Asset 2')).toBeInTheDocument();
  });

  it('submits the master asset search immediately from its form', async () => {
    renderPage('/company/21', <CfoMasterAsetPage />);
    await screen.findByText('Asset 25');

    const search = screen.getByTestId('master-aset-search');
    fireEvent.change(search, { target: { value: 'Asset 3' } });
    const searchForm = search.closest('form');
    expect(searchForm).not.toBeNull();
    fireEvent.submit(searchForm!);

    await waitFor(
      () =>
        expect(apiClient.fetchCompanyAssets).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Asset 3', page: 1 })
        ),
      { timeout: 300 }
    );
  });

  it('moves the mobile asset form into a confirmed modal', async () => {
    vi.mocked(apiClient.createCompanyAsset).mockResolvedValue({
      data: {
        id: 26,
        company_id: 21,
        asset_date: '2026-11-25',
        name: 'New Asset',
        amount: 2,
        price_per_unit: 1500,
        total_price: 3000,
      },
    });
    renderPage('/company/21', <CfoMasterAsetPage />);

    await screen.findByText('Asset 25');
    fireEvent.click(screen.getByTestId('master-aset-open-form'));
    const formModal = screen.getByTestId('master-aset-form-modal');
    fireEvent.change(within(formModal).getByLabelText('Pilih Perusahaan'), {
      target: { value: '21' },
    });
    fireEvent.change(within(formModal).getByLabelText('Tanggal Aset'), {
      target: { value: '2026-11-25' },
    });
    fireEvent.change(within(formModal).getByLabelText('Nama Aset'), {
      target: { value: 'New Asset' },
    });
    const amountInput = within(formModal).getByLabelText('Jumlah');
    fireEvent.change(amountInput, {
      target: { value: '2000' },
    });
    expect(amountInput).toHaveValue('2.000');
    const priceInput = within(formModal).getByLabelText('Harga Satuan');
    fireEvent.change(priceInput, {
      target: { value: '1500' },
    });
    expect(priceInput).toHaveValue('1.500');
    fireEvent.click(within(formModal).getByRole('button', { name: 'Tambah' }));

    expect(apiClient.createCompanyAsset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() =>
      expect(apiClient.createCompanyAsset).toHaveBeenCalledWith({
        company_id: 21,
        asset_date: '2026-11-25',
        name: 'New Asset',
        amount: 2000,
        price_per_unit: 1500,
      })
    );
  });
});
