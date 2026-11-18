import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CascadingHorizontalMenu,
  DataTable,
  HorizontalMenu,
  HorizontalMenuCard,
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

  it('renders reusable HorizontalMenuCard and HorizontalMenu with text-only items', () => {
    const onSelect = vi.fn();
    const items = [
      { code: 'INPUT_MODAL', title: 'Input Modal' },
      { code: 'NERACA', title: 'Neraca' },
    ];

    render(
      <>
        <HorizontalMenuCard
          code="STANDALONE"
          title="Standalone Menu"
          isSelected={true}
        />
        <HorizontalMenu
          items={items}
          selectedCode="INPUT_MODAL"
          onSelect={onSelect}
        />
      </>
    );

    const standalone = screen.getByTestId('horizontal-menu-card-STANDALONE');
    expect(standalone).toHaveTextContent('Standalone Menu');
    expect(standalone).toHaveAttribute('aria-pressed', 'true');

    const modalCard = screen.getByTestId('horizontal-menu-card-INPUT_MODAL');
    const neracaCard = screen.getByTestId('horizontal-menu-card-NERACA');
    expect(modalCard).toHaveAttribute('aria-pressed', 'true');
    expect(neracaCard).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(neracaCard);
    expect(onSelect).toHaveBeenCalledWith({ code: 'NERACA', title: 'Neraca' });
  });

  it('renders CascadingHorizontalMenu and expands child submenu row on selection', () => {
    const items = [
      {
        code: 'INPUT_MODAL',
        title: 'Input Modal',
        children: [
          { code: 'PERUSAHAAN', title: 'Perusahaan' },
          { code: 'NAMA_STAKEHOLDER', title: 'Nama Stakeholder' },
          {
            code: 'DAFTAR_SAHAM_PERUSAHAAN',
            title: 'Daftar Saham Perusahaan',
          },
        ],
      },
      { code: 'NERACA', title: 'Neraca' },
    ];

    render(<CascadingHorizontalMenu items={items} />);

    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_MODAL')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_MODAL'));

    expect(
      screen.getByTestId('horizontal-submenu-INPUT_MODAL')
    ).toBeInTheDocument();
    expect(screen.getByText('Perusahaan')).toBeInTheDocument();
    expect(screen.getByText('Nama Stakeholder')).toBeInTheDocument();
    expect(screen.getByText('Daftar Saham Perusahaan')).toBeInTheDocument();
  });
});
