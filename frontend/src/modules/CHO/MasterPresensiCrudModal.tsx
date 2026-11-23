import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  EmployeeShift,
  EmployeeShiftAssignment,
  EmployeeShiftAssignmentPayload,
  EmployeeShiftPayload,
} from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { useMasterPresensiCrudResource } from '@/lib/choResources';
import { cn } from '@/lib/utils';

export type MasterPresensiTabKey = 'shift' | 'assignment';

export const MASTER_PRESENSI_TABS: Array<{
  key: MasterPresensiTabKey;
  label: string;
}> = [
  { key: 'shift', label: 'Master Shift' },
  { key: 'assignment', label: 'Penugasan Shift' },
];

const SHIFT_STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Tidak Aktif' },
];

const OVERNIGHT_OPTIONS = [
  { value: 'false', label: 'Tidak' },
  { value: 'true', label: 'Ya' },
];

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

export interface MasterPresensiCrudModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterPresensiCrudModal: React.FC<
  MasterPresensiCrudModalProps
> = ({ isOpen, company, companies, onClose }) => {
  const [activeTab, setActiveTab] = useState<MasterPresensiTabKey>('shift');

  const {
    allShifts,
    allAssignments,
    allEmployees,
    loading,
    error,
    clearError,
    createShift,
    updateShift,
    removeShift,
    createAssignment,
    updateAssignment,
    removeAssignment,
  } = useMasterPresensiCrudResource(isOpen, company);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('shift');
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

  const shiftFields = useMemo<CrudFieldConfig<EmployeeShift>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Perusahaan',
        type: 'select',
        placeholder: 'Pilih perusahaan...',
        defaultValue: defaultCompanyId,
        options: companyOptions,
        renderValue: (row) => renderCompanyName(row.company_id, row.company),
      },
      {
        key: 'code',
        label: 'Kode Shift',
        optional: true,
        placeholder: 'Contoh: SHIFT-PAGI',
        renderValue: (row) => row.code || '-',
      },
      {
        key: 'name',
        label: 'Nama Shift',
        placeholder: 'Contoh: Shift Pagi',
      },
      {
        key: 'start_time',
        label: 'Jam Masuk',
        type: 'time',
        placeholder: '08:00',
        renderValue: (row) =>
          row.start_time ? row.start_time.slice(0, 5) : '-',
      },
      {
        key: 'end_time',
        label: 'Jam Pulang',
        type: 'time',
        placeholder: '17:00',
        renderValue: (row) => (row.end_time ? row.end_time.slice(0, 5) : '-'),
      },
      {
        key: 'break_minutes',
        label: 'Istirahat (Menit)',
        type: 'number',
        min: 0,
        step: 1,
        optional: true,
        defaultValue: '0',
        placeholder: 'Contoh: 60',
        renderValue: (row) => `${row.break_minutes ?? 0} menit`,
      },
      {
        key: 'grace_period_minutes',
        label: 'Toleransi (Menit)',
        type: 'number',
        min: 0,
        step: 1,
        optional: true,
        defaultValue: '0',
        placeholder: 'Contoh: 15',
        renderValue: (row) => `${row.grace_period_minutes ?? 0} menit`,
      },
      {
        key: 'is_overnight',
        label: 'Shift Lintas Hari',
        type: 'select',
        optional: true,
        defaultValue: 'false',
        options: OVERNIGHT_OPTIONS,
        renderValue: (row) => (row.is_overnight ? 'Ya' : 'Tidak'),
      },
      {
        key: 'status',
        label: 'Status Shift',
        type: 'select',
        optional: true,
        defaultValue: 'active',
        options: SHIFT_STATUS_OPTIONS,
        renderValue: (row) =>
          row.status === 'inactive' ? 'Tidak Aktif' : 'Aktif',
      },
      {
        key: 'description',
        label: 'Deskripsi',
        type: 'textarea',
        rows: 2,
        optional: true,
        hideInTable: true,
        placeholder: 'Contoh: Jam kerja reguler ',
      },
    ],
    [companyOptions, defaultCompanyId, renderCompanyName]
  );

  const assignmentFields = useMemo<
    CrudFieldConfig<EmployeeShiftAssignment>[]
  >(
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
        placeholder: 'Pilih shift kerja...',
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
          const matched =
            allShifts.find((s) => s.id === Number(row.employee_shift_id)) ??
            row.employee_shift;
          return matched
            ? formatShiftLabel(matched)
            : String(row.employee_shift_id);
        },
      },
      {
        key: 'effective_date',
        label: 'Tanggal Mulai',
        type: 'date',
        defaultValue: todayDate,
        renderValue: (row) =>
          row.effective_date ? row.effective_date.slice(0, 10) : '-',
      },
      {
        key: 'end_date',
        label: 'Tanggal Berakhir',
        type: 'date',
        optional: true,
        renderValue: (row) =>
          row.end_date ? row.end_date.slice(0, 10) : '-',
      },
      {
        key: 'notes',
        label: 'Catatan',
        type: 'textarea',
        rows: 2,
        optional: true,
        placeholder: 'Contoh: Penugasan shift reguler ',
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

  const tabsBar = (
    <div
      role="tablist"
      aria-label="Master Presensi Tabs"
      data-testid="master-presensi-tabs"
      className="flex flex-wrap items-end gap-1 border-b border-border pl-1"
    >
      {MASTER_PRESENSI_TABS.map((tab) => {
        const isSelected = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`master-presensi-tab-${tab.key}`}
            onClick={() => {
              clearError();
              setActiveTab(tab.key);
            }}
            className={cn(
              'cursor-pointer rounded-t-lg border px-4 py-1.5 text-xs transition-colors',
              isSelected
                ? 'relative z-10 -mb-px border-border border-b-card bg-card font-bold text-primary shadow-2xs'
                : 'border-transparent bg-slate-200/60 font-medium text-muted-foreground hover:bg-slate-200 hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  const commonCrudProps = {
    isOpen,
    title: 'Master Presensi',
    subtitle: 'Kelola master shift kerja dan penugasan shift karyawan',
    testId: 'master-presensi-crud-modal',
    tabs: tabsBar,
    layout: 'split' as const,
    labelPlacement: 'left' as const,
    modalSize: 'expanded' as const,
    pageSize: 10,
    loading,
    error,
    onClose,
  };

  const parseShiftPayload = (
    values: Record<string, string>
  ): EmployeeShiftPayload | null => {
    const companyId = parseInt(values.company_id ?? '', 10);
    const code = (values.code ?? '').trim();
    const name = (values.name ?? '').trim();
    const startTime = (values.start_time ?? '').trim();
    const endTime = (values.end_time ?? '').trim();
    const breakMinutesRaw = (values.break_minutes ?? '').trim();
    const graceMinutesRaw = (values.grace_period_minutes ?? '').trim();
    const breakMinutes = breakMinutesRaw ? parseInt(breakMinutesRaw, 10) : 0;
    const gracePeriodMinutes = graceMinutesRaw
      ? parseInt(graceMinutesRaw, 10)
      : 0;
    const isOvernight = values.is_overnight === 'true';
    const status = values.status === 'inactive' ? 'inactive' : 'active';
    const description = (values.description ?? '').trim();

    if (!Number.isFinite(companyId) || !name || !startTime || !endTime) {
      return null;
    }

    return {
      company_id: companyId,
      code: code || null,
      name,
      start_time: startTime,
      end_time: endTime,
      break_minutes: Number.isFinite(breakMinutes) ? breakMinutes : 0,
      grace_period_minutes: Number.isFinite(gracePeriodMinutes)
        ? gracePeriodMinutes
        : 0,
      is_overnight: isOvernight,
      status,
      description: description || null,
    };
  };

  const parseAssignmentPayload = (
    values: Record<string, string>
  ): EmployeeShiftAssignmentPayload | null => {
    const companyId = parseInt(values.company_id ?? '', 10);
    const employeeId = parseInt(values.employee_id ?? '', 10);
    const shiftId = parseInt(values.employee_shift_id ?? '', 10);
    const effectiveDate = (values.effective_date ?? '').trim();
    const endDate = (values.end_date ?? '').trim();
    const notes = (values.notes ?? '').trim();

    if (
      !Number.isFinite(companyId) ||
      !Number.isFinite(employeeId) ||
      !Number.isFinite(shiftId) ||
      !effectiveDate
    ) {
      return null;
    }

    return {
      company_id: companyId,
      employee_id: employeeId,
      employee_shift_id: shiftId,
      effective_date: effectiveDate,
      end_date: endDate || null,
      notes: notes || null,
    };
  };

  if (activeTab === 'assignment') {
    return (
      <CrudModal
        {...commonCrudProps}
        resetKey={`assignment-${company?.id ?? 0}`}
        fields={assignmentFields}
        emptyMessage="Belum ada data penugasan shift."
        items={allAssignments}
        onCreate={async (values) => {
          const payload = parseAssignmentPayload(values);
          if (payload) {
            await createAssignment(payload);
          }
        }}
        onUpdate={async (id, values) => {
          const payload = parseAssignmentPayload(values);
          if (payload) {
            await updateAssignment(id, payload);
          }
        }}
        onDelete={async (id) => {
          await removeAssignment(id);
        }}
      />
    );
  }

  return (
    <CrudModal
      {...commonCrudProps}
      resetKey={`shift-${company?.id ?? 0}`}
      fields={shiftFields}
      emptyMessage="Belum ada data shift kerja."
      items={allShifts}
      onCreate={async (values) => {
        const payload = parseShiftPayload(values);
        if (payload) {
          await createShift(payload);
        }
      }}
      onUpdate={async (id, values) => {
        const payload = parseShiftPayload(values);
        if (payload) {
          await updateShift(id, payload);
        }
      }}
      onDelete={async (id) => {
        await removeShift(id);
      }}
    />
  );
};
