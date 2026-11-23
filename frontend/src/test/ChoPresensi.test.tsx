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

describe('CHO Input Presensi flow: Master Presensi & Input Absensi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearActiveCompanyId();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    clearActiveCompanyId();
    window.localStorage.clear();
  });

  it('shows Input Presensi beside Input SDM -> Master Presensi (tabs) & Input Absensi (regular CRUD) with Master Karyawan style', async () => {
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
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
      { id: 2, name: 'PT. Pangan Nusantara', series: 1 },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (id) => ({
      data: companiesStore.find((c) => c.id === id) ?? null,
    }));

    const employeesStore: apiClient.Employee[] = [
      {
        id: 101,
        company_id: 1,
        name: 'Nadia Putri',
        employee_attendance_code: 'EMP-001',
        company: companiesStore[0],
      },
      {
        id: 102,
        company_id: 2,
        name: 'Citra Lestari',
        employee_attendance_code: 'EMP-002',
        company: companiesStore[1],
      },
    ];

    vi.mocked(apiClient.fetchEmployees).mockImplementation(async () => ({
      data: [...employeesStore],
      meta: { count: employeesStore.length },
    }));

    let shiftsStore: apiClient.EmployeeShift[] = [
      {
        id: 1,
        company_id: 1,
        code: 'SHIFT-PAGI',
        name: 'Shift Pagi',
        start_time: '08:00:00',
        end_time: '17:00:00',
        break_minutes: 60,
        grace_period_minutes: 15,
        is_overnight: false,
        status: 'active',
        description: 'Shift reguler pagi',
        company: companiesStore[0],
      },
    ];

    vi.mocked(apiClient.fetchEmployeeShifts).mockImplementation(async () => ({
      data: [...shiftsStore],
      meta: { count: shiftsStore.length },
    }));

    vi.mocked(apiClient.createEmployeeShift).mockImplementation(
      async (payload) => {
        const created: apiClient.EmployeeShift = {
          id: 2,
          company_id: payload.company_id,
          code: payload.code ?? null,
          name: payload.name,
          start_time:
            payload.start_time.length === 5
              ? `${payload.start_time}:00`
              : payload.start_time,
          end_time:
            payload.end_time.length === 5
              ? `${payload.end_time}:00`
              : payload.end_time,
          break_minutes: payload.break_minutes ?? 0,
          grace_period_minutes: payload.grace_period_minutes ?? 0,
          is_overnight: payload.is_overnight ?? false,
          status: payload.status ?? 'active',
          description: payload.description ?? null,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
        };
        shiftsStore = [created, ...shiftsStore];
        return { data: created };
      }
    );

    vi.mocked(apiClient.updateEmployeeShift).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.EmployeeShift = {
          id,
          company_id: payload.company_id,
          code: payload.code ?? null,
          name: payload.name,
          start_time:
            payload.start_time.length === 5
              ? `${payload.start_time}:00`
              : payload.start_time,
          end_time:
            payload.end_time.length === 5
              ? `${payload.end_time}:00`
              : payload.end_time,
          break_minutes: payload.break_minutes ?? 0,
          grace_period_minutes: payload.grace_period_minutes ?? 0,
          is_overnight: payload.is_overnight ?? false,
          status: payload.status ?? 'active',
          description: payload.description ?? null,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
        };
        shiftsStore = shiftsStore.map((s) => (s.id === id ? updated : s));
        return { data: updated };
      }
    );

    vi.mocked(apiClient.deleteEmployeeShift).mockImplementation(async (id) => {
      shiftsStore = shiftsStore.filter((s) => s.id !== id);
      return { message: 'Employee shift deleted successfully.' };
    });

    let assignmentsStore: apiClient.EmployeeShiftAssignment[] = [
      {
        id: 10,
        company_id: 1,
        employee_id: 101,
        employee_shift_id: 1,
        effective_date: '2026-11-01',
        end_date: null,
        notes: 'Shift awal',
        company: companiesStore[0],
        employee: employeesStore[0],
        employee_shift: shiftsStore[0],
      },
    ];

    vi.mocked(apiClient.fetchEmployeeShiftAssignments).mockImplementation(
      async () => ({
        data: [...assignmentsStore],
        meta: { count: assignmentsStore.length },
      })
    );

    vi.mocked(apiClient.createEmployeeShiftAssignment).mockImplementation(
      async (payload) => {
        const created: apiClient.EmployeeShiftAssignment = {
          id: 11,
          company_id: payload.company_id,
          employee_id: payload.employee_id,
          employee_shift_id: payload.employee_shift_id,
          effective_date: payload.effective_date,
          end_date: payload.end_date ?? null,
          notes: payload.notes ?? null,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
          employee:
            employeesStore.find((e) => e.id === payload.employee_id) ?? null,
          employee_shift:
            shiftsStore.find((s) => s.id === payload.employee_shift_id) ?? null,
        };
        assignmentsStore = [created, ...assignmentsStore];
        return { data: created };
      }
    );

    vi.mocked(apiClient.updateEmployeeShiftAssignment).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.EmployeeShiftAssignment = {
          id,
          company_id: payload.company_id,
          employee_id: payload.employee_id,
          employee_shift_id: payload.employee_shift_id,
          effective_date: payload.effective_date,
          end_date: payload.end_date ?? null,
          notes: payload.notes ?? null,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
          employee:
            employeesStore.find((e) => e.id === payload.employee_id) ?? null,
          employee_shift:
            shiftsStore.find((s) => s.id === payload.employee_shift_id) ?? null,
        };
        assignmentsStore = assignmentsStore.map((a) =>
          a.id === id ? updated : a
        );
        return { data: updated };
      }
    );

    vi.mocked(apiClient.deleteEmployeeShiftAssignment).mockImplementation(
      async (id) => {
        assignmentsStore = assignmentsStore.filter((a) => a.id !== id);
        return { message: 'Employee shift assignment deleted successfully.' };
      }
    );

    let attendancesStore: apiClient.EmployeeAttendance[] = [
      {
        id: 20,
        company_id: 1,
        employee_id: 101,
        employee_shift_id: 1,
        attendance_date: '2026-11-20',
        clock_in_at: '2026-11-20T08:10:00.000000Z',
        clock_out_at: '2026-11-20T17:45:00.000000Z',
        late_minutes: 0,
        overtime_minutes: 45,
        status: 'present',
        notes: 'Hadir normal',
        company: companiesStore[0],
        employee: employeesStore[0],
        employee_shift: shiftsStore[0],
      },
    ];

    vi.mocked(apiClient.fetchEmployeeAttendances).mockImplementation(
      async () => ({
        data: [...attendancesStore],
        meta: { count: attendancesStore.length },
      })
    );

    vi.mocked(apiClient.createEmployeeAttendance).mockImplementation(
      async (payload) => {
        const created: apiClient.EmployeeAttendance = {
          id: 21,
          company_id: payload.company_id,
          employee_id: payload.employee_id,
          employee_shift_id: payload.employee_shift_id ?? null,
          attendance_date: payload.attendance_date,
          clock_in_at: payload.clock_in_at
            ? `${payload.clock_in_at.replace(' ', 'T')}.000000Z`
            : null,
          clock_out_at: payload.clock_out_at
            ? `${payload.clock_out_at.replace(' ', 'T')}.000000Z`
            : null,
          late_minutes: 10,
          overtime_minutes: 30,
          status: payload.status ?? 'present',
          notes: payload.notes ?? null,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
          employee:
            employeesStore.find((e) => e.id === payload.employee_id) ?? null,
          employee_shift:
            shiftsStore.find((s) => s.id === payload.employee_shift_id) ?? null,
        };
        attendancesStore = [created, ...attendancesStore];
        return { data: created };
      }
    );

    vi.mocked(apiClient.updateEmployeeAttendance).mockImplementation(
      async (id, payload) => {
        const updated: apiClient.EmployeeAttendance = {
          id,
          company_id: payload.company_id,
          employee_id: payload.employee_id,
          employee_shift_id: payload.employee_shift_id ?? null,
          attendance_date: payload.attendance_date,
          clock_in_at: payload.clock_in_at
            ? `${payload.clock_in_at.replace(' ', 'T')}.000000Z`
            : null,
          clock_out_at: payload.clock_out_at
            ? `${payload.clock_out_at.replace(' ', 'T')}.000000Z`
            : null,
          late_minutes: 0,
          overtime_minutes: 60,
          status: payload.status ?? 'present',
          notes: payload.notes ?? null,
          company:
            companiesStore.find((c) => c.id === payload.company_id) ?? null,
          employee:
            employeesStore.find((e) => e.id === payload.employee_id) ?? null,
          employee_shift:
            shiftsStore.find((s) => s.id === payload.employee_shift_id) ?? null,
        };
        attendancesStore = attendancesStore.map((a) =>
          a.id === id ? updated : a
        );
        return { data: updated };
      }
    );

    vi.mocked(apiClient.deleteEmployeeAttendance).mockImplementation(
      async (id) => {
        attendancesStore = attendancesStore.filter((a) => a.id !== id);
        return { message: 'Employee attendance deleted successfully.' };
      }
    );

    renderApp();

    // 1. Select company & open CHO module
    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CHO'));

    const choMenu = await screen.findByTestId('cho-horizontal-menu');
    expect(
      within(choMenu).getByTestId('horizontal-menu-card-INPUT_SDM')
    ).toHaveTextContent('Input SDM');
    const inputPresensiCard = within(choMenu).getByTestId(
      'horizontal-menu-card-INPUT_PRESENSI'
    );
    expect(inputPresensiCard).toHaveTextContent('Input Presensi');

    // 2. Click Input Presensi -> shows Master Presensi & Input Absensi
    fireEvent.click(inputPresensiCard);
    const presensiSubmenu = screen.getByTestId(
      'horizontal-submenu-INPUT_PRESENSI'
    );
    expect(
      within(presensiSubmenu).getByTestId(
        'horizontal-menu-card-MASTER_PRESENSI'
      )
    ).toHaveTextContent('Master Presensi');
    expect(
      within(presensiSubmenu).getByTestId('horizontal-menu-card-INPUT_ABSENSI')
    ).toHaveTextContent('Input Absensi');

    // 3. Open Master Presensi modal & verify Master Karyawan split UI style
    fireEvent.click(
      screen.getByTestId('horizontal-menu-card-MASTER_PRESENSI')
    );
    const masterPresensiModal = await screen.findByTestId(
      'master-presensi-crud-modal'
    );
    expect(masterPresensiModal).toHaveClass(
      'max-w-[95vw]',
      'h-[92vh]',
      'max-h-[92vh]'
    );
    expect(
      screen.getByTestId('master-presensi-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('master-presensi-crud-modal-form-panel')
    );
    expect(
      screen.getByTestId('master-presensi-crud-modal-company_id-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');

    // Tab 1: Master Shift CRUD
    expect(
      await within(masterPresensiModal).findByText('Shift Pagi')
    ).toBeInTheDocument();

    fireEvent.change(within(masterPresensiModal).getByLabelText('Kode Shift'), {
      target: { value: 'SHIFT-MALAM' },
    });
    fireEvent.change(within(masterPresensiModal).getByLabelText('Nama Shift'), {
      target: { value: 'Shift Malam' },
    });
    fireEvent.change(within(masterPresensiModal).getByLabelText('Jam Masuk'), {
      target: { value: '22:00' },
    });
    fireEvent.change(within(masterPresensiModal).getByLabelText('Jam Pulang'), {
      target: { value: '06:00' },
    });
    fireEvent.change(
      within(masterPresensiModal).getByLabelText('Shift Lintas Hari'),
      { target: { value: 'true' } }
    );
    fireEvent.click(
      within(masterPresensiModal).getByRole('button', { name: 'Tambah' })
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createEmployeeShift).toHaveBeenCalledWith({
        company_id: 1,
        code: 'SHIFT-MALAM',
        name: 'Shift Malam',
        start_time: '22:00',
        end_time: '06:00',
        break_minutes: 0,
        grace_period_minutes: 0,
        is_overnight: true,
        status: 'active',
        description: null,
      });
      expect(
        within(masterPresensiModal).getByText('Shift Malam')
      ).toBeInTheDocument();
    });

    // Tab 2: Penugasan Shift CRUD
    fireEvent.click(screen.getByTestId('master-presensi-tab-assignment'));
    expect(
      await within(masterPresensiModal).findByText('Shift awal')
    ).toBeInTheDocument();

    const employeeSelect = within(masterPresensiModal).getByLabelText(
      'Karyawan'
    ) as HTMLSelectElement;
    // Only company 1 employees appear
    expect(
      within(employeeSelect).getByText('Nadia Putri (EMP-001)')
    ).toBeInTheDocument();
    expect(
      within(employeeSelect).queryByText('Citra Lestari (EMP-002)')
    ).not.toBeInTheDocument();

    fireEvent.change(employeeSelect, { target: { value: '101' } });
    fireEvent.change(
      within(masterPresensiModal).getByLabelText('Shift Kerja'),
      { target: { value: '2' } }
    );
    fireEvent.change(
      within(masterPresensiModal).getByLabelText('Tanggal Mulai'),
      { target: { value: '2026-12-01' } }
    );
    fireEvent.change(within(masterPresensiModal).getByLabelText('Catatan'), {
      target: { value: 'Rotasi malam' },
    });
    fireEvent.click(
      within(masterPresensiModal).getByRole('button', { name: 'Tambah' })
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createEmployeeShiftAssignment).toHaveBeenCalledWith({
        company_id: 1,
        employee_id: 101,
        employee_shift_id: 2,
        effective_date: '2026-12-01',
        end_date: null,
        notes: 'Rotasi malam',
      });
      expect(
        within(masterPresensiModal).getByText('Rotasi malam')
      ).toBeInTheDocument();
    });

    // Delete assignment row 11
    fireEvent.click(
      within(masterPresensiModal).getByTestId('delete-row-11')
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.deleteEmployeeShiftAssignment).toHaveBeenCalledWith(11);
    });

    fireEvent.click(
      within(masterPresensiModal).getByRole('button', { name: 'Tutup Modal' })
    );

    // 4. Open Input Absensi modal (regular CRUD form with Master Karyawan style)
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_ABSENSI'));
    const inputAbsensiModal = await screen.findByTestId(
      'input-absensi-crud-modal'
    );
    expect(inputAbsensiModal).toHaveClass(
      'max-w-[95vw]',
      'h-[92vh]',
      'max-h-[92vh]'
    );
    expect(
      screen.getByTestId('input-absensi-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('input-absensi-crud-modal-form-panel')
    );
    expect(
      screen.getByTestId('input-absensi-crud-modal-company_id-input-field')
    ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');

    expect(
      await within(inputAbsensiModal).findByText('Hadir normal')
    ).toBeInTheDocument();
    expect(within(inputAbsensiModal).getByText('45 menit')).toBeInTheDocument();

    // Create attendance
    fireEvent.change(within(inputAbsensiModal).getByLabelText('Karyawan'), {
      target: { value: '101' },
    });
    fireEvent.change(within(inputAbsensiModal).getByLabelText('Shift Kerja'), {
      target: { value: '1' },
    });
    fireEvent.change(
      within(inputAbsensiModal).getByLabelText('Tanggal Absensi'),
      { target: { value: '2026-11-23' } }
    );
    fireEvent.change(within(inputAbsensiModal).getByLabelText('Jam Masuk'), {
      target: { value: '2026-11-23T08:25' },
    });
    fireEvent.change(within(inputAbsensiModal).getByLabelText('Jam Pulang'), {
      target: { value: '2026-11-23T17:30' },
    });
    fireEvent.change(
      within(inputAbsensiModal).getByLabelText('Status Kehadiran'),
      { target: { value: 'late' } }
    );
    fireEvent.change(within(inputAbsensiModal).getByLabelText('Catatan'), {
      target: { value: 'Terlambat 10 menit' },
    });
    fireEvent.click(
      within(inputAbsensiModal).getByRole('button', { name: 'Tambah' })
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createEmployeeAttendance).toHaveBeenCalledWith({
        company_id: 1,
        employee_id: 101,
        employee_shift_id: 1,
        attendance_date: '2026-11-23',
        clock_in_at: '2026-11-23 08:25:00',
        clock_out_at: '2026-11-23 17:30:00',
        status: 'late',
        notes: 'Terlambat 10 menit',
      });
      expect(
        within(inputAbsensiModal).getByText('Terlambat 10 menit')
      ).toBeInTheDocument();
    });

    // Update attendance row 21
    fireEvent.click(within(inputAbsensiModal).getByTestId('edit-row-21'));
    expect(
      (
        within(inputAbsensiModal).getByLabelText(
          'Jam Masuk'
        ) as HTMLInputElement
      ).value
    ).toBe('2026-11-23T08:25');

    fireEvent.change(within(inputAbsensiModal).getByLabelText('Catatan'), {
      target: { value: 'Dikoreksi HR' },
    });
    fireEvent.click(
      within(inputAbsensiModal).getByRole('button', { name: 'Perbarui' })
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateEmployeeAttendance).toHaveBeenCalledWith(21, {
        company_id: 1,
        employee_id: 101,
        employee_shift_id: 1,
        attendance_date: '2026-11-23',
        clock_in_at: '2026-11-23 08:25:00',
        clock_out_at: '2026-11-23 17:30:00',
        status: 'late',
        notes: 'Dikoreksi HR',
      });
      expect(
        within(inputAbsensiModal).getByText('Dikoreksi HR')
      ).toBeInTheDocument();
    });

    // Delete attendance row 21
    fireEvent.click(within(inputAbsensiModal).getByTestId('delete-row-21'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.deleteEmployeeAttendance).toHaveBeenCalledWith(21);
    });
  });
});
