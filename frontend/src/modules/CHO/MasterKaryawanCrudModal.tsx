import React, { useEffect, useMemo, useState } from 'react';
import type {
  EmployeePosition,
  EmploymentStatus,
  PayrollGrade,
  TaxStatus,
} from '@/api/client';
import {
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
} from '@/components/ui';
import { useMasterKaryawanCrudResource } from '@/lib/choResources';
import { cn } from '@/lib/utils';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';

export type MasterKaryawanTabKey = 'jabatan' | 'status' | 'grade' | 'pajak';

export const MASTER_KARYAWAN_TABS: Array<{
  key: MasterKaryawanTabKey;
  label: string;
}> = [
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'status', label: 'Status Karyawan' },
  { key: 'grade', label: 'Payroll Grade' },
  { key: 'pajak', label: 'Status Pajak' },
];

export interface MasterKaryawanCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterKaryawanCrudModal: React.FC<
  MasterKaryawanCrudModalProps
> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<MasterKaryawanTabKey>('jabatan');

  const {
    allPositions,
    allStatuses,
    allGrades,
    allTaxStatuses,
    loading,
    error,
    clearError,
    createPosition,
    updatePosition,
    removePosition,
    createStatus,
    updateStatus,
    removeStatus,
    createGrade,
    updateGrade,
    removeGrade,
    createTaxStatus,
    updateTaxStatus,
    removeTaxStatus,
  } = useMasterKaryawanCrudResource(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('jabatan');
      clearError();
    }
  }, [isOpen, clearError]);

  const positionFields = useMemo<CrudFieldConfig<EmployeePosition>[]>(
    () => [
      {
        key: 'name',
        label: 'Nama Jabatan',
        placeholder: 'Contoh: Melakukan tugas A dan B',
      },
    ],
    []
  );

  const statusFields = useMemo<CrudFieldConfig<EmploymentStatus>[]>(
    () => [
      {
        key: 'name',
        label: 'Nama Status',
        placeholder: 'Contoh: Karyawan Tetap',
      },
    ],
    []
  );

  const gradeFields = useMemo<CrudFieldConfig<PayrollGrade>[]>(
    () => [
      {
        key: 'grade',
        label: 'Grade',
        type: 'number',
        min: 1,
        step: 1,
        placeholder: 'Contoh: 1',
      },
      {
        key: 'sub_grade',
        label: 'Sub Grade',
        placeholder: 'Contoh: A',
      },
      {
        key: 'level_label',
        label: 'Label Level',
        optional: true,
        placeholder: 'Contoh: Staff / Supervisor',
        renderValue: (row) => (row.level_label ? row.level_label : '-'),
      },
      {
        key: 'base_salary',
        label: 'Gaji Pokok',
        type: 'decimal',
        placeholder: 'Contoh: 5.500.000',
        renderValue: (row) => formatCapitalIdr(Number(row.base_salary)),
      },
      {
        key: 'position_allowance',
        label: 'Tunjangan Jabatan',
        type: 'decimal',
        optional: true,
        defaultValue: '0',
        placeholder: 'Contoh: 500.000',
        renderValue: (row) =>
          formatCapitalIdr(Number(row.position_allowance ?? 0)),
      },
    ],
    []
  );

  const gradeComputedColumns = useMemo<
    CrudComputedColumnConfig<PayrollGrade>[]
  >(
    () => [
      {
        key: 'total_gross',
        label: 'Total Gross',
        render: (row) => formatCapitalIdr(Number(row.total_gross)),
      },
      {
        key: 'net_employee_received',
        label: 'Gaji Bersih',
        render: (row) => formatCapitalIdr(Number(row.net_employee_received)),
      },
      {
        key: 'total_company_cost',
        label: 'Total Biaya Perusahaan',
        render: (row) => formatCapitalIdr(Number(row.total_company_cost)),
      },
    ],
    []
  );

  const taxStatusFields = useMemo<CrudFieldConfig<TaxStatus>[]>(
    () => [
      {
        key: 'name',
        label: 'Nama Status Pajak',
        placeholder: 'Contoh: Tidak Kawin / 0 Tanggungan',
      },
    ],
    []
  );

  const tabsBar = (
    <div
      role="tablist"
      aria-label="Master Karyawan Tabs"
      data-testid="master-karyawan-tabs"
      className="flex flex-wrap items-end gap-1 border-b border-border pl-1"
    >
      {MASTER_KARYAWAN_TABS.map((tab) => {
        const isSelected = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`master-karyawan-tab-${tab.key}`}
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

  const modalTitle = 'Master Karyawan';
  const modalSubtitle =
    'Kelola jabatan, status karyawan, payroll grade, dan status pajak untuk seluruh perusahaan';

  const commonCrudProps = {
    isOpen,
    title: modalTitle,
    subtitle: modalSubtitle,
    testId: 'master-karyawan-crud-modal',
    tabs: tabsBar,
    layout: 'split' as const,
    labelPlacement: 'left' as const,
    modalSize: 'expanded' as const,
    pageSize: 10,
    loading,
    error,
    onClose,
  };

  const parseNamePayload = (values: Record<string, string>) => {
    const name = (values.name ?? '').trim();
    if (!name) {
      return null;
    }
    return { name };
  };

  const parsePayrollGradePayload = (values: Record<string, string>) => {
    const grade = parseInt(values.grade ?? '', 10);
    const subGrade = (values.sub_grade ?? '').trim();
    const levelLabel = (values.level_label ?? '').trim();
    const baseSalary = parseFloat(values.base_salary ?? '');
    const positionAllowance = values.position_allowance
      ? parseFloat(values.position_allowance)
      : 0;
    if (
      !Number.isFinite(grade) ||
      grade < 1 ||
      !subGrade ||
      !Number.isFinite(baseSalary)
    ) {
      return null;
    }
    return {
      grade,
      sub_grade: subGrade,
      level_label: levelLabel || null,
      base_salary: baseSalary,
      position_allowance: Number.isFinite(positionAllowance)
        ? positionAllowance
        : 0,
    };
  };

  if (activeTab === 'status') {
    return (
      <CrudModal
        {...commonCrudProps}
        resetKey="status"
        fields={statusFields}
        emptyMessage="Belum ada data status karyawan."
        items={allStatuses}
        onCreate={async (values) => {
          const payload = parseNamePayload(values);
          if (payload) {
            await createStatus(payload);
          }
        }}
        onUpdate={async (id, values) => {
          const payload = parseNamePayload(values);
          if (payload) {
            await updateStatus(id, payload);
          }
        }}
        onDelete={async (id) => {
          await removeStatus(id);
        }}
      />
    );
  }

  if (activeTab === 'grade') {
    return (
      <CrudModal
        {...commonCrudProps}
        resetKey="grade"
        fields={gradeFields}
        computedColumns={gradeComputedColumns}
        emptyMessage="Belum ada data payroll grade."
        items={allGrades}
        onCreate={async (values) => {
          const payload = parsePayrollGradePayload(values);
          if (payload) {
            await createGrade(payload);
          }
        }}
        onUpdate={async (id, values) => {
          const payload = parsePayrollGradePayload(values);
          if (payload) {
            await updateGrade(id, payload);
          }
        }}
        onDelete={async (id) => {
          await removeGrade(id);
        }}
      />
    );
  }

  if (activeTab === 'pajak') {
    return (
      <CrudModal
        {...commonCrudProps}
        resetKey="pajak"
        fields={taxStatusFields}
        emptyMessage="Belum ada data status pajak."
        items={allTaxStatuses}
        onCreate={async (values) => {
          const payload = parseNamePayload(values);
          if (payload) {
            await createTaxStatus(payload);
          }
        }}
        onUpdate={async (id, values) => {
          const payload = parseNamePayload(values);
          if (payload) {
            await updateTaxStatus(id, payload);
          }
        }}
        onDelete={async (id) => {
          await removeTaxStatus(id);
        }}
      />
    );
  }

  return (
    <CrudModal
      {...commonCrudProps}
      resetKey="jabatan"
      fields={positionFields}
      emptyMessage="Belum ada data jabatan karyawan."
      items={allPositions}
      onCreate={async (values) => {
        const payload = parseNamePayload(values);
        if (payload) {
          await createPosition(payload);
        }
      }}
      onUpdate={async (id, values) => {
        const payload = parseNamePayload(values);
        if (payload) {
          await updatePosition(id, payload);
        }
      }}
      onDelete={async (id) => {
        await removePosition(id);
      }}
    />
  );
};
