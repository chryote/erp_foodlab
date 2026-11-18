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
  SummaryBanner,
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
            title: 'Daftar Kapital Perusahaan',
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
    expect(screen.getByText('Daftar Kapital Perusahaan')).toBeInTheDocument();
  });

  it('renders reusable CrudModal and triggers create, update, delete, filter, and pagination', async () => {
    const onCreate = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    const onRowAction = vi.fn();

    render(
      <CrudModal
        isOpen={true}
        title="Manajemen Perusahaan"
        pageSize={2}
        fields={[{ key: 'name', label: 'Nama Perusahaan' }]}
        rowActions={[
          {
            key: 'stakeholder',
            label: 'Input Pemegang Saham',
            testId: (row) => `stakeholder-row-${row.id}`,
            onClick: onRowAction,
          },
        ]}
        items={[
          { id: 10, name: 'PT. Contoh Satu' },
          { id: 11, name: 'PT. Contoh Dua' },
          { id: 12, name: 'PT. Contoh Tiga' },
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

    // Custom reusable row action button in Aksi column
    fireEvent.click(screen.getByTestId('stakeholder-row-10'));
    expect(onRowAction).toHaveBeenCalledWith({
      id: 10,
      name: 'PT. Contoh Satu',
    });

    // Navigate to page 2
    fireEvent.click(screen.getByTestId('crud-modal-pagination-next'));
    expect(screen.getByText('PT. Contoh Tiga')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('crud-modal-pagination-prev'));

    const nameInput = screen.getByLabelText('Nama Perusahaan');
    fireEvent.change(nameInput, { target: { value: 'PT. Contoh Empat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onCreate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: 'PT. Contoh Empat',
      });
    });

    fireEvent.click(screen.getByTestId('edit-row-10'));
    fireEvent.change(nameInput, { target: { value: 'PT. Contoh Satu Revisi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(10, {
        name: 'PT. Contoh Satu Revisi',
      });
    });

    fireEvent.click(screen.getByTestId('delete-row-10'));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('delete-row-10'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onDelete).toHaveBeenCalledWith(10);
  });

  it('renders reusable CrudModal with select and number fields', async () => {
    const onCreate = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <CrudModal
        isOpen={true}
        title="Daftar Kapital Perusahaan"
        fields={[
          {
            key: 'company_id',
            label: 'Perusahaan',
            type: 'select',
            placeholder: 'Pilih Perusahaan...',
            options: [
              { value: '1', label: 'PT. Slaras Nusa Foodlab (Rian)' },
              { value: '2', label: 'PT. Pangan Nusantara (Siti Aminah)' },
            ],
          },
          {
            key: 'capital',
            label: 'Kapital (Rp)',
            type: 'decimal',
            placeholder: 'Contoh: 250.000.000',
          },
        ]}
        items={[{ id: 100, company_id: 1, capital: 250000000.5 }]}
        computedColumns={[
          {
            key: 'share_percent',
            label: 'Porsi Kapital (%)',
            render: () => '100%',
          },
        ]}
        summary={
          <SummaryBanner
            label="Total Kapital Seluruh Perusahaan"
            value="Rp 250.000.000,50"
          />
        }
        onClose={onClose}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );

    expect(
      screen.getByText('Total Kapital Seluruh Perusahaan')
    ).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    expect(
      screen.getAllByText('PT. Slaras Nusa Foodlab (Rian)').length
    ).toBeGreaterThanOrEqual(1);

    const capitalInput = screen.getByLabelText(
      'Kapital (Rp)'
    ) as HTMLInputElement;
    fireEvent.change(screen.getByLabelText('Perusahaan'), {
      target: { value: '2' },
    });

    // Simulate character-by-character typing: 5 -> 50 -> 500 -> 5.000 -> 50.000 -> 500.000.000
    for (const typed of [
      '5',
      '50',
      '500',
      '5000',
      '5.0000',
      '50.0000',
      '500.0000',
      '5.000.0000',
      '50.000.0000',
    ]) {
      fireEvent.change(capitalInput, { target: { value: typed } });
    }
    expect(capitalInput.value).toBe('500.000.000');

    fireEvent.change(capitalInput, {
      target: { value: '350000000,75' },
    });
    // Auto-formatted display value uses dot thousand separators
    expect(capitalInput.value).toBe('350.000.000,75');

    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        company_id: '2',
        capital: '350000000.75',
      });
    });
  });

  it('renders CrudModal in readOnly mode without form and without Edit/Hapus buttons', () => {
    const onDetail = vi.fn();

    render(
      <CrudModal
        isOpen={true}
        title="Daftar Kapital Perusahaan"
        readOnly={true}
        fields={[
          { key: 'company_name', label: 'Perusahaan' },
          { key: 'stakeholder_name', label: 'Nama Pemegang Saham' },
          { key: 'capital', label: 'Kapital (Rp)' },
        ]}
        rowActions={[
          {
            key: 'detail',
            label: 'Detail',
            testId: (row) => `detail-row-${row.id}`,
            onClick: onDetail,
          },
        ]}
        items={[
          {
            id: 1,
            company_name: 'PT. Slaras Nusa Foodlab',
            stakeholder_name: 'Rian, Budi',
            capital: 400000000,
          },
        ]}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Tambah' })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-row-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-row-1')).not.toBeInTheDocument();

    const detailButton = screen.getByTestId('detail-row-1');
    expect(detailButton).toHaveTextContent('Detail');
    fireEvent.click(detailButton);
    expect(onDetail).toHaveBeenCalledWith({
      id: 1,
      company_name: 'PT. Slaras Nusa Foodlab',
      stakeholder_name: 'Rian, Budi',
      capital: 400000000,
    });
  });
});
