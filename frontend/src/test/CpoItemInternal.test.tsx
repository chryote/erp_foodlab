import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '../api/client';
import { MasterItemInternalCrudModal } from '../modules/CPO/MasterItemInternalCrudModal';

vi.mock('../api/client');

describe('MasterItemInternalCrudModal active company lock', () => {
  const companies: apiClient.Company[] = [
    { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1, type: 'Utama' },
    { id: 2, name: 'PT. Sejahtera', series: 1, type: 'Bahan' },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.fetchCpoEnums).mockResolvedValue({
      data: {
        item_type: [
          { value: 'Bahan', nama: 'Bahan' },
          { value: 'Kelengkapan', nama: 'Kelengkapan' },
          { value: 'Sarpras', nama: 'Sarpras' },
        ],
      },
    });
    vi.mocked(apiClient.fetchItems).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });
  });

  it('locks Pilih Perusahaan select to the active company only across Bahan, Kelengkapan, and Sarpras tabs', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MasterItemInternalCrudModal
          isOpen={true}
          pageMode
          company={companies[0]}
          companies={companies}
          onClose={() => undefined}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('master-item-internal-crud-modal-page')
      ).toBeInTheDocument();
    });

    for (const tab of ['Bahan', 'Kelengkapan', 'Sarpras']) {
      fireEvent.click(screen.getByTestId(`master-item-internal-tab-${tab}`));

      const companySelect = screen.getByLabelText(
        'Pilih Perusahaan'
      ) as HTMLSelectElement;
      expect(companySelect).toBeDisabled();
      expect(companySelect.value).toBe('1');

      const optionValues = Array.from(companySelect.options).map(
        (opt) => opt.value
      );
      expect(optionValues).toEqual(['', '1']);
      expect(companySelect.options[1]?.text).toBe('PT. Slaras Nusa Foodlab');
    }
  });

  it('loads internal items incrementally without pagination', async () => {
    const itemsByPage: apiClient.Item[][] = [
      [
        {
          id: 11,
          company_id: 1,
          packet_vendor_id: null,
          code: 'ITM-011',
          name: 'Item halaman pertama',
          type: 'Bahan',
        },
      ],
      [
        {
          id: 12,
          company_id: 1,
          packet_vendor_id: null,
          code: 'ITM-012',
          name: 'Item halaman berikutnya',
          type: 'Bahan',
        },
      ],
    ];
    vi.mocked(apiClient.fetchItems).mockImplementation(async (params) => {
      const page = params?.page ?? 1;
      const data = itemsByPage[page - 1] ?? [];
      return {
        data,
        meta: {
          count: data.length,
          total: 2,
          page,
          per_page: 10,
          last_page: 2,
        },
      };
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MasterItemInternalCrudModal
          isOpen
          pageMode
          company={companies[0]}
          companies={companies}
          onClose={() => undefined}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Item halaman pertama')).toBeInTheDocument();
    expect(apiClient.fetchItems).toHaveBeenCalledWith({
      page: 1,
      per_page: 10,
      company_id: 1,
      sort: 'name,id',
    });
    expect(
      screen.queryByTestId('master-item-internal-crud-modal-pagination-info')
    ).not.toBeInTheDocument();

    const scrollContainer = screen.getByTestId(
      'master-item-internal-crud-modal-table-scroll'
    );
    Object.defineProperties(scrollContainer, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, writable: true, value: 600 },
    });
    fireEvent.scroll(scrollContainer);

    expect(
      await screen.findByText('Item halaman berikutnya')
    ).toBeInTheDocument();
    expect(apiClient.fetchItems).toHaveBeenCalledWith({
      page: 2,
      per_page: 10,
      company_id: 1,
      sort: 'name,id',
    });
  });
});
