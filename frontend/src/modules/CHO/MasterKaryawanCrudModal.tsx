import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
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
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterKaryawanCrudModal: React.FC<
  MasterKaryawanCrudModalProps
> = ({ isOpen, company, companies, onClose }) => {
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
  } = useMasterKaryawanCrudResource(isOpen, company);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('jabatan');
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

  const positionFields = useMemo<CrudFieldConfig<EmployeePosition>[]>(
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
        key: 'name',
        label: 'Nama Jabatan',
        placeholder: 'Contoh: Melakukan tugas A dan B',
      },
    ],
    [companyOptions, defaultCompanyId, renderCompanyName]
  );

  const statusFields = useMemo<CrudFieldConfig<EmploymentStatus>[]>(
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
        label: 'Kode Status',
        placeholder: 'Contoh: PKWTT',
      },
      {
        key: 'name',
        label: 'Nama Status',
        placeholder: 'Contoh: Karyawan Tetap',
      },
      {
        key: 'description',
        label: 'Deskripsi',
        type: 'textarea',
        rows: 1,
        optional: true,
        placeholder: 'Opsional: keterangan status kerja',
        renderValue: (row) => (row.description ? row.description : '-'),
      },
    ],
    [companyOptions, defaultCompanyId, renderCompanyName]
  );

  const gradeFields = useMemo<CrudFieldConfig<PayrollGrade>[]>(
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
    [companyOptions, defaultCompanyId, renderCompanyName]
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
        label: 'Kode Pajak',
        placeholder: 'Contoh: TK/0',
      },
      {
        key: 'name',
        label: 'Nama Status Pajak',
        placeholder: 'Contoh: Tidak Kawin / 0 Tanggungan',
      },
      {
        key: 'description',
        label: 'Deskripsi',
        type: 'textarea',
        rows: 1,
        optional: true,
        placeholder: 'Opsional: keterangan PTKP',
        renderValue: (row) => (row.description ? row.description : '-'),
      },
    ],
    [companyOptions, defaultCompanyId, renderCompanyName]
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
    'Kelola jabatan, status karyawan, payroll grade, dan status pajak perusahaan';

  if (activeTab === 'status') {
    return (
      <CrudModal
        resetKey={`status-${company?.id ?? 0}`}
        isOpen={isOpen}
        title={modalTitle}
        subtitle={modalSubtitle}
        testId="master-karyawan-crud-modal"
        tabs={tabsBar}
        fields={statusFields}
        formAlign="start"
        emptyMessage="Belum ada data status karyawan."
        pageSize={5}
        items={allStatuses}
        loading={loading}
        error={error}
        onClose={onClose}
        onCreate={async (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          const code = (values.code ?? '').trim();
          const name = (values.name ?? '').trim();
          const description = (values.description ?? '').trim();
          if (Number.isFinite(companyId) && code && name) {
            await createStatus({
              company_id: companyId,
              code,
              name,
              description: description || null,
            });
          }
        }}
        onUpdate={async (id, values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          const code = (values.code ?? '').trim();
          const name = (values.name ?? '').trim();
          const description = (values.description ?? '').trim();
          if (Number.isFinite(companyId) && code && name) {
            await updateStatus(id, {
              company_id: companyId,
              code,
              name,
              description: description || null,
            });
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
        resetKey={`grade-${company?.id ?? 0}`}
        isOpen={isOpen}
        title={modalTitle}
        subtitle={modalSubtitle}
        testId="master-karyawan-crud-modal"
        tabs={tabsBar}
        fields={gradeFields}
        computedColumns={gradeComputedColumns}
        emptyMessage="Belum ada data payroll grade."
        pageSize={5}
        items={allGrades}
        loading={loading}
        error={error}
        onClose={onClose}
        onCreate={async (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          const grade = parseInt(values.grade ?? '', 10);
          const subGrade = (values.sub_grade ?? '').trim();
          const levelLabel = (values.level_label ?? '').trim();
          const baseSalary = parseFloat(values.base_salary ?? '');
          const positionAllowance = values.position_allowance
            ? parseFloat(values.position_allowance)
            : 0;
          if (
            Number.isFinite(companyId) &&
            Number.isFinite(grade) &&
            grade >= 1 &&
            subGrade &&
            Number.isFinite(baseSalary)
          ) {
            await createGrade({
              company_id: companyId,
              grade,
              sub_grade: subGrade,
              level_label: levelLabel || null,
              base_salary: baseSalary,
              position_allowance: Number.isFinite(positionAllowance)
                ? positionAllowance
                : 0,
            });
          }
        }}
        onUpdate={async (id, values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          const grade = parseInt(values.grade ?? '', 10);
          const subGrade = (values.sub_grade ?? '').trim();
          const levelLabel = (values.level_label ?? '').trim();
          const baseSalary = parseFloat(values.base_salary ?? '');
          const positionAllowance = values.position_allowance
            ? parseFloat(values.position_allowance)
            : 0;
          if (
            Number.isFinite(companyId) &&
            Number.isFinite(grade) &&
            grade >= 1 &&
            subGrade &&
            Number.isFinite(baseSalary)
          ) {
            await updateGrade(id, {
              company_id: companyId,
              grade,
              sub_grade: subGrade,
              level_label: levelLabel || null,
              base_salary: baseSalary,
              position_allowance: Number.isFinite(positionAllowance)
                ? positionAllowance
                : 0,
            });
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
        resetKey={`pajak-${company?.id ?? 0}`}
        isOpen={isOpen}
        title={modalTitle}
        subtitle={modalSubtitle}
        testId="master-karyawan-crud-modal"
        tabs={tabsBar}
        fields={taxStatusFields}
        formAlign="start"
        emptyMessage="Belum ada data status pajak."
        pageSize={5}
        items={allTaxStatuses}
        loading={loading}
        error={error}
        onClose={onClose}
        onCreate={async (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          const code = (values.code ?? '').trim();
          const name = (values.name ?? '').trim();
          const description = (values.description ?? '').trim();
          if (Number.isFinite(companyId) && code && name) {
            await createTaxStatus({
              company_id: companyId,
              code,
              name,
              description: description || null,
            });
          }
        }}
        onUpdate={async (id, values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          const code = (values.code ?? '').trim();
          const name = (values.name ?? '').trim();
          const description = (values.description ?? '').trim();
          if (Number.isFinite(companyId) && code && name) {
            await updateTaxStatus(id, {
              company_id: companyId,
              code,
              name,
              description: description || null,
            });
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
      resetKey={`jabatan-${company?.id ?? 0}`}
      isOpen={isOpen}
      title={modalTitle}
      subtitle={modalSubtitle}
      testId="master-karyawan-crud-modal"
      tabs={tabsBar}
      fields={positionFields}
      formAlign="start"
      emptyMessage="Belum ada data jabatan karyawan."
      pageSize={5}
      items={allPositions}
      loading={loading}
      error={error}
      onClose={onClose}
      onCreate={async (values) => {
        const companyId = parseInt(values.company_id ?? '', 10);
        const name = (values.name ?? '').trim();
        if (Number.isFinite(companyId) && name) {
          await createPosition({
            company_id: companyId,
            name,
          });
        }
      }}
      onUpdate={async (id, values) => {
        const companyId = parseInt(values.company_id ?? '', 10);
        const name = (values.name ?? '').trim();
        if (Number.isFinite(companyId) && name) {
          await updatePosition(id, {
            company_id: companyId,
            name,
          });
        }
      }}
      onDelete={async (id) => {
        await removePosition(id);
      }}
    />
  );
};
