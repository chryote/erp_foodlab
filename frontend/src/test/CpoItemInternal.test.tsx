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
          company={companies[0]}
          companies={companies}
          onClose={() => undefined}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('master-item-internal-crud-modal')
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
});
