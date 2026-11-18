import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CascadingHorizontalMenu,
  CrudModal,
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
          {
            code: 'DAFTAR_KAPITAL_PERUSAHAAN',
            title: 'Daftar Modal Perusahaan',
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
    expect(screen.getByText('Daftar Modal Perusahaan')).toBeInTheDocument();
  });

  it('renders reusable CrudModal and triggers create, update, delete, filter, and pagination', async () => {
    const onCreate = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <CrudModal
        isOpen={true}
        title="Manajemen Perusahaan"
        pageSize={2}
        fields={[
          { key: 'name', label: 'Nama Perusahaan' },
          { key: 'stakeholder_name', label: 'Nama Stakeholder' },
        ]}
        items={[
          { id: 10, name: 'PT. Contoh Satu', stakeholder_name: 'Andi' },
          { id: 11, name: 'PT. Contoh Dua', stakeholder_name: 'Budi' },
          { id: 12, name: 'PT. Contoh Tiga', stakeholder_name: 'Citra' },
        ]}
        onClose={onClose}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('PT. Contoh Satu')).toBeInTheDocument();
    expect(screen.getByText('PT. Contoh Dua')).toBeInTheDocument();
    expect(screen.queryByText('PT. Contoh Tiga')).not.toBeInTheDocument();
    expect(screen.getByTestId('crud-modal-pagination-info')).toHaveTextContent(
      'Halaman 1 dari 2 (3 data)'
    );

    // Navigate to page 2
    fireEvent.click(screen.getByTestId('crud-modal-pagination-next'));
    expect(screen.getByText('PT. Contoh Tiga')).toBeInTheDocument();

    // Filter by stakeholder
    fireEvent.change(screen.getByLabelText('Filter Data'), {
      target: { value: 'Andi' },
    });
    expect(screen.getByText('PT. Contoh Satu')).toBeInTheDocument();
    expect(screen.queryByText('PT. Contoh Tiga')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filter' }));

    const nameInput = screen.getByLabelText('Nama Perusahaan');
    const stakeholderInput = screen.getByLabelText('Nama Stakeholder');
    fireEvent.change(nameInput, { target: { value: 'PT. Contoh Empat' } });
    fireEvent.change(stakeholderInput, { target: { value: 'Dewi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: 'PT. Contoh Empat',
        stakeholder_name: 'Dewi',
      });
    });

    fireEvent.click(screen.getByTestId('edit-row-10'));
    fireEvent.change(nameInput, { target: { value: 'PT. Contoh Satu Revisi' } });
    fireEvent.change(stakeholderInput, { target: { value: 'Andi Wijaya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(10, {
        name: 'PT. Contoh Satu Revisi',
        stakeholder_name: 'Andi Wijaya',
      });
    });

    fireEvent.click(screen.getByTestId('delete-row-10'));
    expect(onDelete).toHaveBeenCalledWith(10);
  });
});
