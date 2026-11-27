import { useEffect, useMemo, useState } from 'react';
import type {
  EmployeeAttendance,
  EmployeeAttendancePayload,
  EmployeeShift,
} from '@/api/client';
import {
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
} from '@/components/ui';
import { EmployeeCombobox } from '@/pages/menu/CHO/INPUT_PRESENSI/EmployeeCombobox';
import {
  useEmployeeAttendanceCrudResource,
  useInfiniteEmployeeAttendancesQuery,
} from '@/lib/choResources';
import { useMenuCompany } from '@/lib/useMenuCompany';

const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'present', label: 'Hadir' },
  { value: 'late', label: 'Terlambat' },
  { value: 'absent', label: 'Alpa' },
  { value: 'leave', label: 'Cuti / Izin' },
  { value: 'sick', label: 'Sakit' },
  { value: 'holiday', label: 'Libur' },
];

const ATTENDANCE_STATUS_LABELS = Object.fromEntries(
  ATTENDANCE_STATUS_OPTIONS.map((option) => [option.value, option.label])
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
  return raw ? raw.slice(0, 16).replace('T', ' ') : '-';
}

function normalizeDateTimePayload(raw?: string): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

const ATTENDANCE_SORT_KEYS = [
  'employee_name',
  'employee_shift_name',
  'attendance_date',
  'clock_in_at',
  'clock_out_at',
  'late_minutes',
  'overtime_minutes',
  'status',
  'notes',
] as const;

export default function ChoInputAbsensiPage() {
  const { company, loading: companyLoading, error: companyError } =
    useMenuCompany();
  const isOpen = Boolean(company);
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
  } = useEmployeeAttendanceCrudResource(isOpen, company, false, false);
  const [sort, setSort] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'attendance_date', direction: 'desc' });
  const sortParam = `${sort.direction === 'asc' ? '' : '-'}${sort.key}`;
  const attendanceQuery = useInfiniteEmployeeAttendancesQuery(
    company?.id ?? null,
    sortParam,
    isOpen
  );
  const attendanceRows =
    attendanceQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const todayDate = useMemo(() => getTodayDateString(), []);
  const companyId = company ? String(company.id) : '';
  const filteredShifts = useMemo(
    () =>
      allShifts.filter(
        (shift) => Number(shift.company_id) === Number(companyId)
      ),
    [allShifts, companyId]
  );

  useEffect(() => {
    if (!isOpen) clearError();
  }, [clearError, isOpen]);

  const fields = useMemo<CrudFieldConfig<EmployeeAttendance>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Perusahaan',
        type: 'select',
        defaultValue: companyId,
        hideInForm: true,
        hideInTable: true,
        options: company ? [{ value: companyId, label: company.name }] : [],
      },
      {
        key: 'employee_id',
        label: 'Karyawan',
        type: 'select',
        placeholder: 'Pilih karyawan...',
        sortable: true,
        sortKey: 'employee_name',
        options: [],
        renderControl: ({ id, value, disabled, editingItem, onChange }) => (
          <EmployeeCombobox
            id={id}
            companyId={company?.id ?? null}
            value={value}
            selectedLabel={
              editingItem?.employee?.name ??
              allEmployees.find((employee) => String(employee.id) === value)
                ?.name
            }
            disabled={disabled}
            onChange={onChange}
          />
        ),
        renderValue: (row) =>
          row.employee?.name ??
          allEmployees.find((employee) => employee.id === row.employee_id)
            ?.name ??
          String(row.employee_id),
      },
      {
        key: 'employee_shift_id',
        label: 'Shift Kerja',
        type: 'select',
        optional: true,
        placeholder: 'Pilih shift kerja (opsional)...',
        sortable: true,
        sortKey: 'employee_shift_name',
        options: filteredShifts.map((shift) => ({
          value: String(shift.id),
          label: formatShiftLabel(shift),
        })),
        renderValue: (row) =>
          row.employee_shift
            ? formatShiftLabel(row.employee_shift)
            : filteredShifts.find((shift) => shift.id === row.employee_shift_id)
              ? formatShiftLabel(
                  filteredShifts.find(
                    (shift) => shift.id === row.employee_shift_id
                  )!
                )
              : '-',
      },
      {
        key: 'attendance_date',
        label: 'Tanggal Absensi',
        type: 'date',
        defaultValue: todayDate,
        sortable: true,
        renderValue: (row) => row.attendance_date?.slice(0, 10) ?? '-',
      },
      {
        key: 'clock_in_at',
        label: 'Jam Masuk',
        type: 'datetime-local',
        optional: true,
        sortable: true,
        renderValue: (row) => formatDateTimeDisplay(row.clock_in_at),
      },
      {
        key: 'clock_out_at',
        label: 'Jam Pulang',
        type: 'datetime-local',
        optional: true,
        sortable: true,
        renderValue: (row) => formatDateTimeDisplay(row.clock_out_at),
      },
      {
        key: 'status',
        label: 'Status Kehadiran',
        type: 'select',
        defaultValue: 'present',
        options: ATTENDANCE_STATUS_OPTIONS,
        sortable: true,
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
        sortable: true,
        renderValue: (row) => row.notes || '-',
      },
    ],
    [allEmployees, company, companyId, filteredShifts, todayDate]
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

  const parsePayload = (
    values: Record<string, string>
  ): EmployeeAttendancePayload | null => {
    const resolvedCompanyId = Number(values.company_id || company?.id);
    const employeeId = Number(values.employee_id);
    const shiftRaw = values.employee_shift_id?.trim() ?? '';
    const shiftId = shiftRaw ? Number(shiftRaw) : null;
    const attendanceDate = values.attendance_date?.trim() ?? '';
    if (!Number.isSafeInteger(resolvedCompanyId) || !Number.isSafeInteger(employeeId) || !attendanceDate) {
      return null;
    }

    return {
      company_id: resolvedCompanyId,
      employee_id: employeeId,
      employee_shift_id: shiftId !== null && Number.isSafeInteger(shiftId) ? shiftId : null,
      attendance_date: attendanceDate,
      clock_in_at: normalizeDateTimePayload(values.clock_in_at),
      clock_out_at: normalizeDateTimePayload(values.clock_out_at),
      status: values.status?.trim() || 'present',
      notes: values.notes?.trim() || null,
    };
  };

  if (companyLoading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Memuat data perusahaan...
      </p>
    );
  }
  if (companyError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {companyError}
      </p>
    );
  }

  return (
    <CrudModal
      resetKey={`input-absensi-${company?.id ?? 0}`}
      isOpen={isOpen}
      pageMode
      title="Input Absensi"
      subtitle="Kelola data kehadiran, jam masuk, jam pulang, dan status absensi karyawan"
      testId="input-absensi-crud-modal"
      layout="split"
      labelPlacement="left"
      modalSize="expanded"
      hideRowNumber
      pageSize={10}
      fields={fields}
      computedColumns={computedColumns}
      emptyMessage="Belum ada data absensi karyawan."
      items={allAttendances}
      loading={attendanceQuery.isLoading || loading}
      error={
        attendanceQuery.error instanceof Error
          ? attendanceQuery.error.message
          : error
      }
      displayItems={attendanceRows}
      hasMore={Boolean(attendanceQuery.hasNextPage)}
      onLoadMore={() => {
        if (attendanceQuery.hasNextPage && !attendanceQuery.isFetchingNextPage) {
          void attendanceQuery.fetchNextPage();
        }
      }}
      isLoadingMore={attendanceQuery.isFetchingNextPage}
      loadMoreError={
        attendanceQuery.isFetchNextPageError
          ? 'Gagal memuat data berikutnya.'
          : null
      }
      onRetryLoadMore={() => {
        if (attendanceQuery.isFetchNextPageError) {
          void attendanceQuery.fetchNextPage();
        }
      }}
      sortKey={sort.key}
      sortDirection={sort.direction}
      onSort={(key) => {
        if (!ATTENDANCE_SORT_KEYS.includes(key as (typeof ATTENDANCE_SORT_KEYS)[number])) {
          return;
        }
        setSort((current) =>
          current.key === key
            ? {
                key,
                direction: current.direction === 'asc' ? 'desc' : 'asc',
              }
            : { key, direction: 'asc' }
        );
      }}
      onClose={() => undefined}
      onCreate={async (values) => {
        const payload = parsePayload(values);
        if (payload) await createAttendance(payload);
      }}
      onUpdate={async (id, values) => {
        const payload = parsePayload(values);
        if (payload) await updateAttendance(id, payload);
      }}
      onDelete={async (id) => {
        await removeAttendance(id);
      }}
    />
  );
}
