import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as apiClient from '../api/client';
import { clearActiveCompanyId } from '../lib/activeCompanyStorage';
import { DEFAULT_CDO_MODULE } from '../modules/CDO/CdoModuleCard';
import { DEFAULT_CFO_MODULE } from '../modules/CFO/CfoModuleCard';
import { DEFAULT_CHO_MODULE } from '../modules/CHO/ChoModuleCard';
import { DEFAULT_CMO_MODULE } from '../modules/CMO/CmoModuleCard';
import { DEFAULT_CPO_MODULE } from '../modules/CPO/CpoModuleCard';

vi.mock('../api/client');

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/dashboard-flow-simulator']}>
      <App />
    </MemoryRouter>
  );
}

describe('CHO Input Penggajian flow: Input Payroll', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearActiveCompanyId();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    clearActiveCompanyId();
    window.localStorage.clear();
  });

  it('opens Input Penggajian -> Input Payroll, switches company/period, edits Bonus/Lembur/Potongan/THR, previews PPh 21, and finalizes per employee row', async () => {
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

    const companiesStore: apiClient.Company[] = [
      { id: 1, name: 'CV Area 31', series: 1 },
      { id: 2, name: 'PT. Slaras Nusa Foodlab', series: 1 },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (id) => ({
      data: companiesStore.find((c) => c.id === id) ?? null,
    }));

    const buildRows = (
      companyId: number,
      statusMap: Record<number, apiClient.PayrollItemStatus>
    ): apiClient.PayrollWorkspaceRow[] => {
      if (companyId === 2) {
        return [
          {
            employee_id: 201,
            employee: {
              id: 201,
              company_id: 2,
              name: 'Budi Foodlab',
              employee_position: { id: 2, company_id: 2, name: 'Analis' },
              tax_status: { id: 2, company_id: 2, code: 'TK/0', name: 'TK/0' },
            },
            payroll_item_id: null,
            payroll_run_id: null,
            payroll_group: 'office',
            attendance_days: 25,
            effective_work_days: 25,
            base_salary: 5000000,
            bpjs_kesehatan: 50000,
            bpjs_ketenagakerjaan: 100000,
            bonus: 0,
            overtime: 0,
            deduction: 0,
            thr: 0,
            pph21: 0,
            total_net: 4850000,
            status: statusMap[201] ?? 'draft',
          },
        ];
      }

      return [
        {
          employee_id: 101,
          employee: {
            id: 101,
            company_id: 1,
            name: 'Harno Fiqriandi',
            email: 'harno@foodlab.id',
            phone: '081234567890',
            nik_ktp: '3372013112900001',
            birth_place: 'Surakarta',
            birth_date: '1990-12-31',
            employee_attendance_code: 'HarnoSPV101',
            bpjs_kesehatan: '0001697587918',
            bpjs_ketenagakerjaan: '22066430764',
            npwp_number: '844315150526000',
            employee_position: { id: 1, company_id: 1, name: 'SPV' },
            employment_status: {
              id: 1,
              company_id: 1,
              name: 'Karyawan Tetap',
            },
            payroll_grade: {
              id: 1,
              company_id: 1,
              grade: 2,
              sub_grade: 'A',
              level_label: 'Supervisor',
              base_salary: 2400000,
              position_allowance: 16600,
              total_gross: 2416600,
              bpjs_kesehatan_company: 96664,
              bpjs_kesehatan_employee: 24166,
              bpjs_ketenagakerjaan_company: 95214,
              bpjs_ketenagakerjaan_employee: 48332,
              net_employee_received: 2344102,
              total_company_cost: 2608478,
            },
            tax_status: { id: 1, company_id: 1, code: 'TK/0', name: 'TK/0' },
          },
          payroll_item_id: null,
          payroll_run_id: null,
          payroll_group: 'office',
          attendance_days: 25,
          effective_work_days: 25,
          bank_account_number: '1380017389045',
          base_salary: 2416600,
          bpjs_kesehatan: 24166,
          bpjs_ketenagakerjaan: 48332,
          bonus: finalizedItems[101]?.bonus ?? 0,
          overtime: finalizedItems[101]?.overtime ?? 0,
          deduction: finalizedItems[101]?.deduction ?? 0,
          thr: finalizedItems[101]?.thr ?? 0,
          pph21: finalizedItems[101]?.pph21 ?? 0,
          total_net: finalizedItems[101]?.total_net ?? 2344102,
          status: statusMap[101] ?? 'draft',
        },
        {
          employee_id: 102,
          employee: {
            id: 102,
            company_id: 1,
            name: 'Aliana Awaliyah',
            employee_position: { id: 3, company_id: 1, name: 'Outlet' },
            tax_status: { id: 1, company_id: 1, code: 'TK/0', name: 'TK/0' },
          },
          payroll_item_id: null,
          payroll_run_id: null,
          payroll_group: 'outlet',
          attendance_days: 18,
          effective_work_days: 25,
          base_salary: 1260000,
          bpjs_kesehatan: 0,
          bpjs_ketenagakerjaan: 0,
          bonus: 0,
          overtime: 0,
          deduction: 0,
          thr: 0,
          pph21: 0,
          total_net: 1260000,
          status: statusMap[102] ?? 'draft',
        },
      ];
    };

    const statusStore: Record<number, apiClient.PayrollItemStatus> = {};
    const finalizedItems: Record<
      number,
      {
        bonus: number;
        overtime: number;
        deduction: number;
        thr: number;
        pph21: number;
        total_net: number;
      }
    > = {};

    vi.mocked(apiClient.fetchPayrollWorkspace).mockImplementation(
      async (companyId, period) => ({
        data: {
          period,
          period_date: `${period}-01`,
          cutoff_start_date: '2025-12-21',
          cutoff_end_date: '2026-01-22',
          cutoff_day: 22,
          period_start_day: 21,
          effective_work_days: 25,
          company:
            companiesStore.find((c) => c.id === companyId) ?? companiesStore[0],
          payroll_run: null,
          rows: buildRows(companyId, statusStore),
        },
      })
    );

    vi.mocked(apiClient.finalizeEmployeePayrollRow).mockImplementation(
      async (payload) => {
        statusStore[payload.employee_id] = 'finalized';
        finalizedItems[payload.employee_id] = {
          bonus: payload.bonus,
          overtime: payload.overtime,
          deduction: payload.deduction,
          thr: payload.thr,
          pph21: 31325,
          total_net: 5365075,
        };
        return {
          data: {
            id: 900 + payload.employee_id,
            company_id: payload.company_id,
            payroll_run_id: 50,
            employee_id: payload.employee_id,
            payroll_group: payload.payroll_group ?? 'office',
            attendance_days: 25,
            base_salary: 2416600,
            bpjs_kesehatan: 24166,
            bpjs_ketenagakerjaan: 48332,
            bonus: payload.bonus,
            overtime: payload.overtime,
            deduction: payload.deduction,
            thr: payload.thr,
            pph21: 31325,
            total_net: 5365075,
            status: 'finalized',
            finalized_at: '2026-01-22T10:00:00Z',
          },
        };
      }
    );

    renderApp();

    // Select company 1 -> CHO (SDM) -> Input Penggajian -> Input Payroll
    await waitFor(() => {
      expect(screen.getByTestId('company-tab-1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CHO'));

    await waitFor(() => {
      expect(
        screen.getByTestId('horizontal-menu-card-INPUT_PENGGAJIAN')
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-INPUT_PENGGAJIAN')
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('horizontal-menu-card-INPUT_PAYROLL')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_PAYROLL'));

    const modal = await screen.findByTestId('input-payroll-modal');
    expect(modal).toBeInTheDocument();

    // Verify company select and picker-only datepicker for Periode Bulan
    const companySelect = within(modal).getByLabelText(
      'Pilih Perusahaan'
    ) as HTMLSelectElement;
    const periodInput = within(modal).getByLabelText(
      'Periode Bulan'
    ) as HTMLInputElement;
    expect(companySelect.value).toBe('1');
    expect(periodInput.type).toBe('date');

    // Verify manual keyboard input is blocked on Periode Bulan
    const keyEvent = new KeyboardEvent('keydown', {
      key: '2',
      bubbles: true,
      cancelable: true,
    });
    periodInput.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(true);

    fireEvent.change(periodInput, { target: { value: '2026-01-15' } });

    await waitFor(() => {
      expect(within(modal).getByText('Harno Fiqriandi')).toBeInTheDocument();
      expect(within(modal).getByText('Aliana Awaliyah')).toBeInTheDocument();
    });

    // Verify attendance indicator
    expect(
      within(modal).getByTestId('payroll-attendance-101')
    ).toHaveTextContent('Hadir 25/25 hr');
    expect(
      within(modal).getByTestId('payroll-attendance-102')
    ).toHaveTextContent('Hadir 18/25 hr');

    // Fill Bonus & Potongan on Harno Fiqriandi (2416600 + 3454898 - 24166 - 48332 - 402600 = 5396400 -> PPh 21 = Rp 31.325)
    fireEvent.change(
      within(modal).getByLabelText('Bonus Harno Fiqriandi'),
      { target: { value: '3454898' } }
    );
    fireEvent.change(
      within(modal).getByLabelText('Potongan Harno Fiqriandi'),
      { target: { value: '402600' } }
    );

    expect(within(modal).getByTestId('payroll-pph21-101')).toHaveTextContent(
      '31.325'
    );
    expect(
      within(modal).getByTestId('payroll-total-net-101')
    ).toHaveTextContent('5.365.075');

    // Finalize Harno Fiqriandi's row with confirmation dialog
    fireEvent.click(within(modal).getByTestId('finalize-payroll-row-101'));

    const confirmDialog = await screen.findByTestId(
      'input-payroll-confirm-dialog'
    );
    expect(confirmDialog).toHaveTextContent('Harno Fiqriandi');
    fireEvent.click(
      within(confirmDialog).getByTestId('input-payroll-confirm-dialog-confirm')
    );

    await waitFor(() => {
      expect(apiClient.finalizeEmployeePayrollRow).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          employee_id: 101,
          period: '2026-01',
          bonus: 3454898,
          overtime: 0,
          deduction: 402600,
          thr: 0,
        })
      );
    });

    await waitFor(() => {
      expect(
        within(modal).getByTestId('finalized-badge-row-101')
      ).toHaveTextContent('Sudah Final');
      expect(
        within(modal).getByTestId('detail-payroll-row-101')
      ).toBeInTheDocument();
    });

    // Payroll detail modal opens automatically after finalization
    const detailModal = await screen.findByTestId('payroll-detail-modal');
    expect(detailModal).toHaveTextContent('Harno Fiqriandi');
    expect(detailModal).toHaveTextContent('3372013112900001');
    expect(detailModal).toHaveTextContent('Karyawan Tetap');
    expect(detailModal).toHaveTextContent('Grade 2A (Supervisor)');
    expect(detailModal).toHaveTextContent('1380017389045');
    expect(detailModal).toHaveTextContent('2.400.000');
    expect(detailModal).toHaveTextContent('16.600');
    expect(detailModal).toHaveTextContent('96.664');
    expect(detailModal).toHaveTextContent('95.214');
    expect(detailModal).toHaveTextContent('Kantor mengeluarkan');
    expect(detailModal).toHaveTextContent('Gaji yang diterima');
    expect(detailModal).toHaveTextContent('SLIP GAJI');
    expect(detailModal).toHaveTextContent('JANUARI 2026');
    expect(
      within(detailModal).getByTestId('payroll-detail-net-received')
    ).toHaveTextContent('5.365.075');

    // Close detail modal and reopen via Detail button on finalized row
    fireEvent.click(within(detailModal).getByTestId('payroll-detail-close-btn'));
    await waitFor(() => {
      expect(
        screen.queryByTestId('payroll-detail-modal')
      ).not.toBeInTheDocument();
    });

    fireEvent.click(within(modal).getByTestId('detail-payroll-row-101'));
    expect(await screen.findByTestId('payroll-detail-modal')).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByTestId('payroll-detail-modal')).getByTestId(
        'payroll-detail-close-btn'
      )
    );

    // Switch company in modal to company 2 -> fetches company 2 workspace
    fireEvent.change(companySelect, { target: { value: '2' } });
    await waitFor(() => {
      expect(within(modal).getByText('Budi Foodlab')).toBeInTheDocument();
    });
  });
});
