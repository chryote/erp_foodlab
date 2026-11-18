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

  it('renders all 5 ERP module cards (CFO, CHO, CPO, CDO, CMO) and opens selected module workspace', async () => {
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

    vi.mocked(apiClient.fetchHealthStatus).mockResolvedValue({
      status: 'ok',
      service: 'ERP FoodLab API',
      checks: { database: 'ok', cache_redis: 'ok' },
      timestamp: '2026-11-18T00:00:00Z',
    });

    vi.mocked(apiClient.fetchLabSamples).mockResolvedValue({
      data: [
        {
          id: 10,
          batch_code: 'FL-OLIVE-010',
          product_name: 'Extra Virgin Olive Oil',
          category: 'Oils',
          ph_level: 5.5,
          moisture_percent: 0.2,
          status: 'approved',
        },
      ],
      meta: { count: 1, cache_key: 'erp_foodlab:samples:list' },
    });

    render(<App />);

    expect(screen.getByText('CFO (Keuangan)')).toBeInTheDocument();
    expect(screen.getByText('CHO (SDM)')).toBeInTheDocument();
    expect(screen.getByText('CPO (Persediaan Barang Dagang)')).toBeInTheDocument();
    expect(screen.getByText('CDO (Pemasaran)')).toBeInTheDocument();
    expect(screen.getByText('CMO (Penjualan)')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Extra Virgin Olive Oil')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('module-card-CFO'));
    expect(screen.getByTestId('selected-module-panel')).toHaveTextContent(
      'Jurnal Penutupan Bulanan FoodLab'
    );
  });
});
