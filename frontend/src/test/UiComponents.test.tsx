import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  ModuleLauncherCard,
} from '../components/ui';

describe('Reusable UI Components (src/components/ui)', () => {
  it('renders ModuleLauncherCard with only big icon and title', () => {
    const onClick = vi.fn();
    render(
      <ModuleLauncherCard
        code="CFO"
        title="CFO (Keuangan)"
        icon={<svg data-testid="cfo-svg" />}
        accent="cfo"
        isSelected={true}
        onClick={onClick}
      />
    );

    const button = screen.getByTestId('module-card-CFO');
    expect(button).toHaveTextContent('CFO (Keuangan)');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('cfo-svg')).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders reusable Card, CardHeader, Button, Badge, and DataTable', () => {
    const rows = [{ id: 'DOC-1', name: 'Laporan Kas', status: 'Verified' }];
    render(
      <Card>
        <CardHeader
          eyebrow="MODUL"
          title="Ringkasan"
          actions={<Button variant="primary">Tambah</Button>}
        />
        <DataTable
          columns={[
            { key: 'id', header: 'ID', render: (r) => r.id },
            { key: 'name', header: 'Nama', render: (r) => r.name },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <Badge variant="ok">{r.status}</Badge>,
            },
          ]}
          data={rows}
          rowKey={(r) => r.id}
        />
      </Card>
    );

    expect(screen.getByText('Ringkasan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tambah' })).toBeInTheDocument();
    expect(screen.getByText('Laporan Kas')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });
});
