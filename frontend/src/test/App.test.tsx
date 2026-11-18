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

  it('renders PT. Slaras Nusa Foodlab header and all 5 ERP module cards (CFO, CHO, CPO, CDO, CMO)', async () => {
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
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'PT. Slaras Nusa Foodlab',
          stakeholder_name: 'Budi Santoso',
        },
      ],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.createCompany).mockResolvedValue({
      data: {
        id: 2,
        name: 'PT. Pangan Nusantara',
        stakeholder_name: 'Siti Aminah',
      },
    });
    vi.mocked(apiClient.updateCompany).mockResolvedValue({
      data: {
        id: 2,
        name: 'PT. Pangan Nusantara Baru',
        stakeholder_name: 'Rina Kartika',
      },
    });
    vi.mocked(apiClient.deleteCompany).mockResolvedValue({
      message: 'Company deleted successfully.',
    });

    render(<App />);

    expect(screen.getByText('PT. Slaras Nusa Foodlab')).toBeInTheDocument();
    expect(screen.getByText('CFO (Keuangan)')).toBeInTheDocument();
    expect(screen.getByText('CHO (SDM)')).toBeInTheDocument();
    expect(screen.getByText('CPO (Persediaan Barang Dagang)')).toBeInTheDocument();
    expect(screen.getByText('CDO (Pemasaran)')).toBeInTheDocument();
    expect(screen.getByText('CMO (Penjualan)')).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClient.fetchErpModules).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByTestId('cfo-horizontal-menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('module-card-CFO'));

    const cfoSubMenu = screen.getByTestId('cfo-horizontal-menu');
    expect(cfoSubMenu).toBeInTheDocument();
    expect(screen.getByText('Input Modal')).toBeInTheDocument();
    expect(screen.getByText('Input Operasional')).toBeInTheDocument();
    expect(screen.getByText('Input Aset')).toBeInTheDocument();
    expect(screen.getByText('Laba Rugi')).toBeInTheDocument();
    expect(screen.getByText('Neraca')).toBeInTheDocument();

    const inputModalCard = screen.getByTestId('horizontal-menu-card-INPUT_MODAL');
    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_MODAL')
    ).not.toBeInTheDocument();

    fireEvent.click(inputModalCard);
    expect(inputModalCard).toHaveAttribute('aria-pressed', 'true');

    const inputModalSubMenu = screen.getByTestId(
      'horizontal-submenu-INPUT_MODAL'
    );
    expect(inputModalSubMenu).toBeInTheDocument();
    expect(screen.getByText('Perusahaan')).toBeInTheDocument();
    expect(screen.getByText('Daftar Saham Perusahaan')).toBeInTheDocument();

    const perusahaanCard = screen.getByTestId('horizontal-menu-card-PERUSAHAAN');
    fireEvent.click(perusahaanCard);
    expect(perusahaanCard).toHaveAttribute('aria-pressed', 'true');

    const modal = await screen.findByTestId('perusahaan-crud-modal');
    expect(modal).toBeInTheDocument();
    await waitFor(() => {
      expect(apiClient.fetchCompanies).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();

    // Create company with stakeholder_name
    const nameInput = screen.getByLabelText('Nama Perusahaan');
    const stakeholderInput = screen.getByLabelText('Nama Stakeholder');
    fireEvent.change(nameInput, { target: { value: 'PT. Pangan Nusantara' } });
    fireEvent.change(stakeholderInput, { target: { value: 'Siti Aminah' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    await waitFor(() => {
      expect(apiClient.createCompany).toHaveBeenCalledWith({
        name: 'PT. Pangan Nusantara',
        stakeholder_name: 'Siti Aminah',
      });
      expect(screen.getByText('PT. Pangan Nusantara')).toBeInTheDocument();
      expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    });

    // Filter company table
    const filterInput = screen.getByLabelText('Filter Perusahaan / Stakeholder');
    fireEvent.change(filterInput, { target: { value: 'Siti' } });
    expect(screen.getByText('PT. Pangan Nusantara')).toBeInTheDocument();
    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filter' }));

    // Update company
    fireEvent.click(screen.getByTestId('edit-row-2'));
    fireEvent.change(nameInput, {
      target: { value: 'PT. Pangan Nusantara Baru' },
    });
    fireEvent.change(stakeholderInput, {
      target: { value: 'Rina Kartika' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui' }));

    await waitFor(() => {
      expect(apiClient.updateCompany).toHaveBeenCalledWith(2, {
        name: 'PT. Pangan Nusantara Baru',
        stakeholder_name: 'Rina Kartika',
      });
      expect(screen.getByText('PT. Pangan Nusantara Baru')).toBeInTheDocument();
      expect(screen.getByText('Rina Kartika')).toBeInTheDocument();
    });

    // Delete company
    fireEvent.click(screen.getByTestId('delete-row-2'));
    await waitFor(() => {
      expect(apiClient.deleteCompany).toHaveBeenCalledWith(2);
      expect(
        screen.queryByText('PT. Pangan Nusantara Baru')
      ).not.toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-INPUT_OPERASIONAL')
    );
    expect(
      screen.queryByTestId('horizontal-submenu-INPUT_MODAL')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('perusahaan-crud-modal')
    ).not.toBeInTheDocument();
  });
});
