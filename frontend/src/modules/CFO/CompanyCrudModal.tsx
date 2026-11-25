import React, { useEffect, useMemo, useState } from 'react';
import type { CapitalCompany, Company, CompanyType } from '@/api/client';
import {
  Badge,
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
  SummaryBanner,
} from '@/components/ui';
import {
  type CompanyCrudResource,
  DEFAULT_CFO_ENUMS,
  useCompanyCrudResource,
  useStakeholderCrudResource,
} from '@/lib/cfoResources';
import {
  formatCapitalIdr,
  formatCapitalSharePercent,
} from './CapitalCompanyCrudModal';

export const COMPANY_CRUD_FIELDS: CrudFieldConfig<Company>[] = [
  {
    key: 'name',
    label: 'Nama Perusahaan',
    placeholder: 'Contoh: PT. ABC DEF',
  },
  {
    key: 'series',
    label: 'Seri',
    type: 'number',
    min: 1,
    step: 1,
    defaultValue: '1',
    placeholder: 'Contoh: 1',
    renderValue: (row) => `Seri ${row.series ?? 1}`,
    filterText: (row) => `Seri ${row.series ?? 1}`,
  },
  {
    key: 'type',
    label: 'Tipe Perusahaan',
    type: 'select',
    placeholder: 'Pilih tipe perusahaan...',
    defaultValue: DEFAULT_CFO_ENUMS.company_type[0]?.value ?? 'Utama',
    options: DEFAULT_CFO_ENUMS.company_type.map((opt) => ({
      value: opt.value,
      label: opt.nama,
    })),
    renderValue: (row) => row.type ?? 'Utama',
  },
];

export const STAKEHOLDER_CRUD_FIELDS: CrudFieldConfig<CapitalCompany>[] = [
  {
    key: 'stakeholder_name',
    label: 'Nama Pemegang Saham',
    placeholder: 'Contoh: Budi Santoso',
  },
  {
    key: 'capital',
    label: 'Kapital (Rp)',
    type: 'decimal',
    placeholder: 'Contoh: 250.000.000',
    renderValue: (row) => formatCapitalIdr(Number(row.capital)),
    filterText: (row) =>
      `${row.capital} ${formatCapitalIdr(Number(row.capital))}`,
  },
];

export interface CompanyStakeholderModalProps {
  isOpen: boolean;
  company: Company | null;
  readOnly?: boolean;
  onClose: () => void;
}

export const CompanyStakeholderModal: React.FC<
  CompanyStakeholderModalProps
> = ({ isOpen, company, readOnly = false, onClose }) => {
  const { stakeholders, loading, error, create, update, remove } =
    useStakeholderCrudResource(isOpen, company);

  const totalCompanyCapital = useMemo(
    () =>
      stakeholders.reduce((sum, item) => sum + (Number(item.capital) || 0), 0),
    [stakeholders]
  );

  const computedColumns = useMemo<
    CrudComputedColumnConfig<CapitalCompany>[]
  >(() => [
    {
      key: 'share_percent',
      label: 'Porsi Kapital (%)',
      render: (row) => (
        <Badge variant="ok">
          {formatCapitalSharePercent(Number(row.capital), totalCompanyCapital)}
        </Badge>
      ),
      filterText: (row) =>
        formatCapitalSharePercent(Number(row.capital), totalCompanyCapital),
    },
  ], [totalCompanyCapital]);

  return (
    <CrudModal
      isOpen={isOpen && company !== null}
      title={readOnly ? 'Detail Pemegang Saham' : 'Input Pemegang Saham'}
      subtitle={
        company
          ? readOnly
            ? `Daftar pemegang saham & modal untuk ${company.name}`
            : `Kelola pemegang saham & modal untuk ${company.name}`
          : undefined
      }
      testId={
        readOnly ? 'detail-pemegang-saham-modal' : 'pemegang-saham-crud-modal'
      }
      layout="split"
      labelPlacement="left"
      modalSize="expanded"
      fields={STAKEHOLDER_CRUD_FIELDS}
      computedColumns={computedColumns}
      summary={
        <SummaryBanner
          label={`Total Kapital ${company?.name ?? 'Perusahaan'}`}
          value={formatCapitalIdr(totalCompanyCapital)}
          testId={
            readOnly
              ? 'total-kapital-detail-pemegang-saham-banner'
              : 'total-kapital-pemegang-saham-banner'
          }
        />
      }
      emptyMessage="Belum ada data pemegang saham untuk perusahaan ini."
      pageSize={10}
      items={stakeholders}
      loading={loading}
      error={error}
      readOnly={readOnly}
      onClose={onClose}
      onCreate={async (values) => {
        const name = (values.stakeholder_name ?? '').trim();
        const capital = parseFloat(values.capital ?? '');
        if (name && Number.isFinite(capital)) {
          await create(name, capital);
        }
      }}
      onUpdate={async (id, values) => {
        const name = (values.stakeholder_name ?? '').trim();
        const capital = parseFloat(values.capital ?? '');
        if (name && Number.isFinite(capital)) {
          await update(id, name, capital);
        }
      }}
      onDelete={async (id) => {
        await remove(id);
      }}
    />
  );
};

export interface CompanyCrudModalProps {
  isOpen: boolean;
  companyResource?: CompanyCrudResource;
  onClose: () => void;
}

export const CompanyCrudModal: React.FC<CompanyCrudModalProps> = ({
  isOpen,
  companyResource,
  onClose,
}) => {
  const fallbackResource = useCompanyCrudResource(isOpen && !companyResource);
  const {
    enums,
    refetchEnums,
    companies,
    loading,
    error,
    create,
    update,
    remove,
  } = companyResource ?? fallbackResource;
  const [selectedStakeholderCompany, setSelectedStakeholderCompany] =
    useState<Company | null>(null);

  useEffect(() => {
    if (isOpen) {
      void refetchEnums();
    } else {
      setSelectedStakeholderCompany(null);
    }
  }, [isOpen, refetchEnums]);

  const companyTypeOptions = useMemo(
    () =>
      enums.company_type.map((opt) => ({
        value: opt.value,
        label: opt.nama,
      })),
    [enums.company_type]
  );

  const companyTypeLabelMap = useMemo(
    () => new Map(enums.company_type.map((opt) => [opt.value, opt.nama])),
    [enums.company_type]
  );

  const defaultCompanyType = enums.company_type[0]?.value ?? 'Utama';

  const companyFields = useMemo<CrudFieldConfig<Company>[]>(
    () => [
      {
        key: 'name',
        label: 'Nama Perusahaan',
        placeholder: 'Contoh: PT. ABC DEF',
      },
      {
        key: 'series',
        label: 'Seri',
        type: 'number',
        min: 1,
        step: 1,
        defaultValue: '1',
        placeholder: 'Contoh: 1',
        renderValue: (row) => `Seri ${row.series ?? 1}`,
        filterText: (row) => `Seri ${row.series ?? 1}`,
      },
      {
        key: 'type',
        label: 'Tipe Perusahaan',
        type: 'select',
        placeholder: 'Pilih tipe perusahaan...',
        defaultValue: defaultCompanyType,
        options: companyTypeOptions,
        renderValue: (row) => {
          const typeValue = row.type ?? defaultCompanyType;
          return companyTypeLabelMap.get(typeValue) ?? typeValue;
        },
        filterText: (row) => {
          const typeValue = row.type ?? defaultCompanyType;
          return companyTypeLabelMap.get(typeValue) ?? typeValue;
        },
      },
    ],
    [companyTypeLabelMap, companyTypeOptions, defaultCompanyType]
  );

  const parseCompanyInput = (values: Record<string, string>) => {
    const parsedSeries = parseInt(values.series ?? '1', 10);
    const series =
      Number.isFinite(parsedSeries) && parsedSeries >= 1 ? parsedSeries : 1;
    const rawType = (values.type ?? '').trim();
    const type: CompanyType =
      enums.company_type.find((opt) => opt.value === rawType)?.value ??
      defaultCompanyType;
    return {
      name: values.name ?? '',
      series,
      type,
    };
  };

  return (
    <>
      <CrudModal
        isOpen={isOpen}
        title="Manajemen Perusahaan"
        subtitle="Kelola data perusahaan pada modul CFO (Input Modal)"
        testId="perusahaan-crud-modal"
        layout="split"
        labelPlacement="left"
        modalSize="expanded"
        fields={companyFields}
        rowActions={[
          {
            key: 'stakeholder',
            label: 'Input Pemegang Saham',
            variant: 'secondary',
            testId: (row) => `stakeholder-row-${row.id}`,
            onClick: (row) => setSelectedStakeholderCompany(row),
          },
        ]}
        emptyMessage="Belum ada data perusahaan."
        pageSize={10}
        items={companies}
        loading={loading}
        error={error}
        onClose={onClose}
        onCreate={async (values) => {
          const parsed = parseCompanyInput(values);
          await create(parsed.name, parsed.series, parsed.type);
        }}
        onUpdate={async (id, values) => {
          const parsed = parseCompanyInput(values);
          const updated = await update(
            id,
            parsed.name,
            parsed.series,
            parsed.type
          );
          if (updated) {
            setSelectedStakeholderCompany((prev) =>
              prev?.id === id ? updated : prev
            );
          }
        }}
        onDelete={async (id) => {
          const ok = await remove(id);
          if (ok) {
            setSelectedStakeholderCompany((prev) =>
              prev?.id === id ? null : prev
            );
          }
        }}
      />

      <CompanyStakeholderModal
        isOpen={isOpen && selectedStakeholderCompany !== null}
        company={selectedStakeholderCompany}
        onClose={() => setSelectedStakeholderCompany(null)}
      />
    </>
  );
};
