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
    fireEvent.click(inputModalCard);
    expect(inputModalCard).toHaveAttribute('aria-pressed', 'true');
  });
});
