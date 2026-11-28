import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  EmployeeAttendance,
  EmployeeAttendancePayload,
  EmployeeShift,
} from '@/api/client';
import {
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
} from '@/components/ui';
import { useEmployeeAttendanceCrudResource } from '@/lib/choResources';
import { useInfiniteEmployeeAttendancesQuery } from '@/lib/choResources';

const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'present', label: 'Hadir' },
  { value: 'late', label: 'Terlambat' },
  { value: 'absent', label: 'Alpa' },
  { value: 'leave', label: 'Cuti / Izin' },
  { value: 'sick', label: 'Sakit' },
  { value: 'holiday', label: 'Libur' },
];

const ATTENDANCE_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  ATTENDANCE_STATUS_OPTIONS.map((opt) => [opt.value, opt.label])
);

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShiftLabel(shift: EmployeeShift): string {
  const start = shift.start_time ? shift.start_time.slice(0, 5) : '--:--';
  const end = shift.end_time ? shift.end_time.slice(0, 5) : '--:--';
  return `${shift.name} (${start} - ${end})`;
}

function formatDateTimeDisplay(raw?: string | null): string {
  if (!raw) {
    return '-';
  }
  return raw.slice(0, 16).replace('T', ' ');
}

function normalizeDateTimePayload(raw?: string): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

export interface InputAbsensiCrudModalProps {
  isOpen: boolean;
  pageMode?: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const InputAbsensiCrudModal: React.FC<InputAbsensiCrudModalProps> = ({
  isOpen,
  pageMode = false,
  company,
  companies,
  onClose,
}) => {
  const {
    allAttendances,
    allShifts,
    allEmployees,
    loading,
    error,
    clearError,
    createAttendance,
    updateAttendance,
    removeAttendance,
  } = useEmployeeAttendanceCrudResource(isOpen, company, !pageMode);
  const [sort, setSort] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>({ key: 'attendance_date', direction: 'desc' });
  const sortParam = `${sort?.direction === 'asc' ? '' : '-'}${sort?.key ?? 'attendance_date'},-id`;
  const pageQuery = useInfiniteEmployeeAttendancesQuery(
    company?.id ?? null,
    sortParam,
    pageMode
  );
  const pageItems =
    pageQuery.data?.pages.flatMap((page) => page.data) ?? [];

  useEffect(() => {
    if (!isOpen) {
      clearError();
    }
  }, [isOpen, clearError]);

  const availableCompanies = useMemo<Company[]>(() => {
    if (companies && companies.length > 0) {
      return companies;
    }
    return company ? [company] : [];
  }, [companies, company]);

  const defaultCompanyId = company ? String(company.id) : '';
  const todayDate = useMemo(() => getTodayDateString(), []);

  const companyOptions = useMemo(
    () =>
      availableCompanies.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [availableCompanies]
  );

  const renderCompanyName = useMemo(
    () => (companyId: number | undefined, fallbackCompany?: Company | null) =>
      availableCompanies.find((c) => c.id === Number(companyId))?.name ??
      fallbackCompany?.name ??
      String(companyId ?? ''),
    [availableCompanies]
  );

  const fields = useMemo<CrudFieldConfig<EmployeeAttendance>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Perusahaan',
        type: 'select',
        placeholder: 'Pilih perusahaan...',
        defaultValue: defaultCompanyId,
        options: companyOptions,
        resetFieldsOnChange: ['employee_id', 'employee_shift_id'],
        renderValue: (row) => renderCompanyName(row.company_id, row.company),
      },
      {
        key: 'employee_id',
        label: 'Karyawan',
        type: 'select',
        placeholder: 'Pilih karyawan...',
        disabled: (values) => !values.company_id,
        options: (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          if (!Number.isFinite(companyId)) {
            return [];
          }
          return allEmployees
            .filter((emp) => Number(emp.company_id) === companyId)
            .map((emp) => ({
              value: String(emp.id),
              label: emp.employee_attendance_code
                ? `${emp.name} (${emp.employee_attendance_code})`
                : emp.name,
            }));
        },
        renderValue: (row) =>
          allEmployees.find((e) => e.id === Number(row.employee_id))?.name ??
          row.employee?.name ??
          String(row.employee_id),
      },
      {
        key: 'employee_shift_id',
        label: 'Shift Kerja',
        type: 'select',
        optional: true,
        placeholder: 'Pilih shift kerja (opsional)...',
        disabled: (values) => !values.company_id,
        options: (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          if (!Number.isFinite(companyId)) {
            return [];
          }
          return allShifts
            .filter((s) => Number(s.company_id) === companyId)
            .map((s) => ({
              value: String(s.id),
              label: formatShiftLabel(s),
            }));
        },
        renderValue: (row) => {
          if (!row.employee_shift_id) {
            return '-';
          }
          const matched =
            allShifts.find((s) => s.id === Number(row.employee_shift_id)) ??
            row.employee_shift;
          return matched
            ? formatShiftLabel(matched)
            : String(row.employee_shift_id);
        },
      },
      {
        key: 'attendance_date',
        label: 'Tanggal Absensi',
        sortable: true,
        type: 'date',
        defaultValue: todayDate,
        renderValue: (row) =>
          row.attendance_date ? row.attendance_date.slice(0, 10) : '-',
      },
      {
        key: 'clock_in_at',
        label: 'Jam Masuk',
        sortable: true,
        type: 'datetime-local',
        optional: true,
        renderValue: (row) => formatDateTimeDisplay(row.clock_in_at),
      },
      {
        key: 'clock_out_at',
        label: 'Jam Pulang',
        type: 'datetime-local',
        optional: true,
        renderValue: (row) => formatDateTimeDisplay(row.clock_out_at),
      },
      {
        key: 'status',
        label: 'Status Kehadiran',
        type: 'select',
        defaultValue: 'present',
        options: ATTENDANCE_STATUS_OPTIONS,
        renderValue: (row) =>
          ATTENDANCE_STATUS_LABELS[row.status] ?? row.status ?? '-',
      },
      {
        key: 'notes',
        label: 'Catatan',
        type: 'textarea',
        rows: 2,
        optional: true,
        placeholder: 'Contoh: Hadir tepat waktu / lembur proyek lab',
        renderValue: (row) => row.notes || '-',
      },
    ],
    [
      allEmployees,
      allShifts,
      companyOptions,
      defaultCompanyId,
      renderCompanyName,
      todayDate,
    ]
  );

  const computedColumns = useMemo<
    CrudComputedColumnConfig<EmployeeAttendance>[]
  >(
    () => [
      {
        key: 'late_minutes',
        label: 'Terlambat',
        sortable: true,
        render: (row) => `${row.late_minutes ?? 0} menit`,
      },
      {
        key: 'overtime_minutes',
        label: 'Lembur',
        sortable: true,
        render: (row) => `${row.overtime_minutes ?? 0} menit`,
      },
    ],
    []
  );

  const parseAttendancePayload = (
    values: Record<string, string>
  ): EmployeeAttendancePayload | null => {
    const companyId = parseInt(values.company_id ?? '', 10);
    const employeeId = parseInt(values.employee_id ?? '', 10);
    const shiftRaw = (values.employee_shift_id ?? '').trim();
    const shiftId = shiftRaw ? parseInt(shiftRaw, 10) : null;
    const attendanceDate = (values.attendance_date ?? '').trim();
    const clockInAt = normalizeDateTimePayload(values.clock_in_at);
    const clockOutAt = normalizeDateTimePayload(values.clock_out_at);
    const status = (values.status ?? 'present').trim() || 'present';
    const notes = (values.notes ?? '').trim();

    if (
      !Number.isFinite(companyId) ||
      !Number.isFinite(employeeId) ||
      !attendanceDate
    ) {
      return null;
    }

    return {
      company_id: companyId,
      employee_id: employeeId,
      employee_shift_id:
        shiftId !== null && Number.isFinite(shiftId) ? shiftId : null,
      attendance_date: attendanceDate,
      clock_in_at: clockInAt,
      clock_out_at: clockOutAt,
      status,
      notes: notes || null,
    };
  };

  return (
    <CrudModal
      resetKey={`input-absensi-${company?.id ?? 0}`}
      isOpen={isOpen}
      pageMode={pageMode}
      title="Input Absensi"
      subtitle="Kelola data kehadiran, jam masuk, jam pulang, dan status absensi karyawan"
      testId="input-absensi-crud-modal"
      layout="split"
      labelPlacement="left"
      modalSize="expanded"
      pageSize={10}
      fields={fields}
      computedColumns={computedColumns}
      emptyMessage="Belum ada data absensi karyawan."
      items={allAttendances}
      loading={pageMode ? pageQuery.isLoading || loading : loading}
      error={
        pageQuery.error instanceof Error && pageMode
          ? pageQuery.error.message
          : error
      }
      displayItems={pageMode ? pageItems : undefined}
      hasMore={pageMode && Boolean(pageQuery.hasNextPage)}
      onLoadMore={
        pageMode
          ? () => {
              if (pageQuery.hasNextPage && !pageQuery.isFetchingNextPage) {
                void pageQuery.fetchNextPage();
              }
            }
          : undefined
      }
      isLoadingMore={pageMode && pageQuery.isFetchingNextPage}
      loadMoreError={
        pageQuery.isFetchNextPageError
          ? 'Gagal memuat data berikutnya.'
          : null
      }
      onRetryLoadMore={
        pageMode
          ? () => {
              if (pageQuery.isFetchNextPageError) {
                void pageQuery.fetchNextPage();
              }
            }
          : undefined
      }
      sortKey={sort?.key ?? 'attendance_date'}
      sortDirection={sort?.direction ?? 'desc'}
      onSort={
        pageMode
          ? (key) => {
              if (
                ![
                  'attendance_date',
                  'clock_in_at',
                  'late_minutes',
                  'overtime_minutes',
                ].includes(key)
              ) {
                return;
              }
              setSort((current) =>
                current?.key === key
                  ? {
                      key,
                      direction:
                        current.direction === 'asc' ? 'desc' : 'asc',
                    }
                  : { key, direction: 'asc' }
              );
            }
          : undefined
      }
      onClose={onClose}
      onCreate={async (values) => {
        const payload = parseAttendancePayload(values);
        if (payload) {
          await createAttendance(payload);
        }
      }}
      onUpdate={async (id, values) => {
        const payload = parseAttendancePayload(values);
        if (payload) {
          await updateAttendance(id, payload);
        }
      }}
      onDelete={async (id) => {
        await removeAttendance(id);
      }}
    />
  );
};
