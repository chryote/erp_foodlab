import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '../api/client';
import { MasterPaketCrudModal } from '../modules/CPO/MasterPaketCrudModal';
import { ViewPaketAwalModal } from '../modules/CPO/ViewPaketAwalModal';
import { getDashboardMenuPage } from '../pages/menuPages';
import CpoKelolaVendorPage from '../pages/menu/CPO/KELOLA_VENDOR/direct';
import CpoMasterPaketAwalPage from '../pages/menu/CPO/INPUT_PAKET/master-paket-paket-awal';

vi.mock('../api/client');
vi.mock('../lib/useMenuCompany', () => ({
  useMenuCompany: () => ({
    company: { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
    companies: [{ id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 }],
    loading: false,
    error: null,
  }),
}));

const company: apiClient.Company = {
  id: 1,
  name: 'PT. Slaras Nusa Foodlab',
  series: 1,
};

const vendors: apiClient.PacketVendor[] = [
  { id: 1, company_owner_id: 1, name: 'Vendor halaman pertama', type: 'Bahan' },
  { id: 2, company_owner_id: 1, name: 'Vendor halaman berikutnya', type: 'Bahan' },
];

const packages: apiClient.DefaultPackage[] = [
  {
    id: 1,
    brand_name: 'Brand halaman pertama',
    packet_name_id: 1,
    packet_name: { id: 1, name: 'Paket A' },
    packet_category_id: 1,
    packet_category: { id: 1, name: 'Kategori A' },
    company_id: 1,
    price: 1000,
  },
  {
    id: 2,
    brand_name: 'Brand halaman berikutnya',
    packet_name_id: 1,
    packet_name: { id: 1, name: 'Paket A' },
    packet_category_id: 1,
    packet_category: { id: 1, name: 'Kategori A' },
    company_id: 1,
    price: 2000,
  },
];

function renderWithQueryClient(element: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
  );
}

function renderMasterPackagePages(
  initialEntry = '/dashboard/company/1/menu/CPO/KELOLA_VENDOR/direct'
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/dashboard/company/:companyId/menu/CPO/KELOLA_VENDOR/direct"
            element={<CpoKelolaVendorPage />}
          />
          <Route
            path="/dashboard/company/:companyId/menu/CPO/INPUT_PAKET/master-paket-paket-awal"
            element={<CpoMasterPaketAwalPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function scrollToBottom(testId: string) {
  const scrollContainer = screen.getByTestId(testId);
  Object.defineProperties(scrollContainer, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 400 },
    scrollTop: { configurable: true, writable: true, value: 600 },
  });
  fireEvent.scroll(scrollContainer);
}

function mockCpoReferenceLists() {
  vi.mocked(apiClient.fetchCpoEnums).mockResolvedValue({
    data: {
      item_type: [{ value: 'Bahan', nama: 'Bahan' }],
      packet_vendor_type: [{ value: 'Bahan', nama: 'Bahan' }],
    },
  });
  vi.mocked(apiClient.fetchPacketNames).mockResolvedValue({
    data: [{ id: 1, name: 'Paket A' }],
    meta: { count: 1 },
  });
  vi.mocked(apiClient.fetchPacketCategories).mockResolvedValue({
    data: [{ id: 1, name: 'Kategori A' }],
    meta: { count: 1 },
  });
  vi.mocked(apiClient.fetchItems).mockResolvedValue({
    data: [],
    meta: { count: 0 },
  });
  vi.mocked(apiClient.fetchItemPackets).mockResolvedValue({
    data: [],
    meta: { count: 0 },
  });
  vi.mocked(apiClient.fetchIngredients).mockResolvedValue({
    data: [],
    meta: { count: 0 },
  });
}

describe('CPO page lazy loading', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCpoReferenceLists();
  });

  it('registers the separate Paket Awal route', () => {
    expect(
      getDashboardMenuPage(
        '/dashboard/company/1/menu/CPO/KELOLA_VENDOR/direct'
      )
    ).toBe(CpoKelolaVendorPage);
    expect(
      getDashboardMenuPage(
        '/dashboard/company/1/menu/CPO/INPUT_PAKET/master-paket-paket-awal'
      )
    ).toBe(CpoMasterPaketAwalPage);
  });

  it('loads vendor rows incrementally without a card or pagination', async () => {
    vi.mocked(apiClient.fetchPacketVendors).mockImplementation(
      async (params) => {
        const page = params?.page ?? 1;
        const data = page === 1 ? [vendors[0]] : [vendors[1]];
        return {
          data,
          meta: { count: data.length, total: vendors.length, last_page: 2 },
        };
      }
    );

    renderWithQueryClient(
      <MasterPaketCrudModal
        isOpen
        pageMode
        company={company}
        companies={[company]}
        onClose={() => undefined}
      />
    );

    expect(
      await screen.findByText('Vendor halaman pertama')
    ).toBeInTheDocument();
    expect(apiClient.fetchPacketVendors).toHaveBeenCalledWith({
      page: 1,
      per_page: 10,
      sort: 'name,id',
    });
    expect(
      screen.getByTestId('master-paket-crud-modal-form-panel')
    ).not.toHaveClass('rounded-xl', 'border', 'bg-muted/25');
    expect(
      screen.queryByTestId('master-paket-crud-modal-pagination-info')
    ).not.toBeInTheDocument();

    scrollToBottom('master-paket-crud-modal-table-scroll');
    expect(
      await screen.findByText('Vendor halaman berikutnya')
    ).toBeInTheDocument();
    expect(apiClient.fetchPacketVendors).toHaveBeenCalledWith({
      page: 2,
      per_page: 10,
      sort: 'name,id',
    });
  });

  it('loads package rows incrementally without pagination', async () => {
    vi.mocked(apiClient.fetchPacketVendors).mockResolvedValue({
      data: vendors,
      meta: { count: vendors.length },
    });
    vi.mocked(apiClient.fetchDefaultPackages).mockImplementation(
      async (params) => {
        const page = params?.page ?? 1;
        const data = page === 1 ? [packages[0]] : [packages[1]];
        return {
          data,
          meta: { count: data.length, total: packages.length, last_page: 2 },
        };
      }
    );

    renderWithQueryClient(
      <MasterPaketCrudModal
        isOpen
        pageMode
        company={company}
        companies={[company]}
        onClose={() => undefined}
      />
    );

    fireEvent.click(screen.getByTestId('master-paket-tab-default-package'));
    expect(
      await screen.findByText('Brand halaman pertama')
    ).toBeInTheDocument();
    expect(apiClient.fetchDefaultPackages).toHaveBeenCalledWith({
      page: 1,
      per_page: 10,
      sort: 'brand_name,id',
    });
    expect(
      screen.getByTestId('master-paket-crud-modal-form-panel')
    ).not.toHaveClass('rounded-xl', 'border', 'bg-muted/25');
    expect(
      screen.getByTestId('master-paket-crud-modal-table-panel')
    ).not.toHaveClass('rounded-xl', 'border', 'bg-card');
    expect(
      screen.queryByTestId('master-paket-crud-modal-pagination')
    ).not.toBeInTheDocument();

    scrollToBottom('master-paket-default-packages-scroll');
    expect(
      await screen.findByText('Brand halaman berikutnya')
    ).toBeInTheDocument();
    expect(apiClient.fetchDefaultPackages).toHaveBeenCalledWith({
      page: 2,
      per_page: 10,
      sort: 'brand_name,id',
    });
  });

  it('keeps Vendor and Paket Awal on separate pages without page-level navigation', async () => {
    vi.mocked(apiClient.fetchPacketVendors).mockResolvedValue({
      data: vendors,
      meta: { count: vendors.length },
    });
    vi.mocked(apiClient.fetchDefaultPackages).mockResolvedValue({
      data: [packages[0]],
      meta: { count: 1, total: 1, last_page: 1 },
    });

    const vendorPage = renderMasterPackagePages();

    expect(await screen.findByText('Vendor halaman pertama')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Halaman Master Paket' })
    ).not.toBeInTheDocument();
    vendorPage.unmount();

    renderMasterPackagePages(
      '/dashboard/company/1/menu/CPO/INPUT_PAKET/master-paket-paket-awal'
    );

    expect(await screen.findByText('Brand halaman pertama')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Halaman Master Paket' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('master-paket-tab-default-package')
    ).toHaveAttribute('aria-selected', 'true');
    expect(apiClient.fetchDefaultPackages).toHaveBeenCalledWith({
      page: 1,
      per_page: 10,
      sort: 'brand_name,id',
    });
  });

  it('loads the read-only package view incrementally', async () => {
    vi.mocked(apiClient.fetchDefaultPackages).mockImplementation(
      async (params) => {
        const page = params?.page ?? 1;
        const data = page === 1 ? [packages[0]] : [packages[1]];
        return {
          data,
          meta: { count: data.length, total: packages.length, last_page: 2 },
        };
      }
    );

    renderWithQueryClient(
      <ViewPaketAwalModal
        isOpen
        pageMode
        companies={[company]}
        onClose={() => undefined}
      />
    );

    expect(
      await screen.findByText('Brand halaman pertama')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('view-paket-awal-modal-pagination-info')
    ).not.toBeInTheDocument();

    scrollToBottom('view-paket-awal-modal-table-scroll');
    expect(
      await screen.findByText('Brand halaman berikutnya')
    ).toBeInTheDocument();
    expect(apiClient.fetchDefaultPackages).toHaveBeenCalledWith({
      page: 2,
      per_page: 10,
      sort: 'brand_name,id',
    });
  });
});
