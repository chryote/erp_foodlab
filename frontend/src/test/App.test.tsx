import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as apiClient from '../api/client';

vi.mock('../api/client');

describe('App integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches and displays health status and lab samples on mount', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Extra Virgin Olive Oil')).toBeInTheDocument();
    });

    expect(screen.getByTestId('overall-status')).toHaveTextContent('OK');
    expect(screen.getByText('FL-OLIVE-010')).toBeInTheDocument();
  });
});
