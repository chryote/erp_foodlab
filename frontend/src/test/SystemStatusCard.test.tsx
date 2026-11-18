import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SystemStatusCard } from '../components/SystemStatusCard';
import type { HealthResponse } from '../api/client';

describe('SystemStatusCard', () => {
  const mockHealth: HealthResponse = {
    status: 'ok',
    service: 'ERP FoodLab API',
    checks: {
      database: 'ok',
      cache_redis: 'ok',
    },
    timestamp: '2026-11-18T00:00:00Z',
  };

  it('renders API, MySQL, and Redis health indicators', () => {
    render(
      <SystemStatusCard
        health={mockHealth}
        loading={false}
        error={null}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByTestId('overall-status')).toHaveTextContent('OK');
    expect(screen.getByTestId('mysql-status')).toHaveTextContent('OK');
    expect(screen.getByTestId('redis-status')).toHaveTextContent('OK');
  });

  it('displays an alert when an error message is passed', () => {
    render(
      <SystemStatusCard
        health={null}
        loading={false}
        error="Connection refused"
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Connection refused');
  });

  it('triggers onRefresh callback when Refresh Status button is clicked', () => {
    const onRefresh = vi.fn();
    render(
      <SystemStatusCard
        health={mockHealth}
        loading={false}
        error={null}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh status/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
