import React, { useEffect, useMemo, useState } from 'react';
import type { Company, ExpenseCategory, ExpenseType } from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { useMasterOperasionalCrudResource } from '@/lib/cfoResources';
import { cn } from '@/lib/utils';

export type MasterOperasionalTabKey = 'kategori' | 'tipe';

export const MASTER_OPERASIONAL_TABS: Array<{
  key: MasterOperasionalTabKey;
  label: string;
}> = [
  { key: 'kategori', label: 'Kategori' },
  { key: 'tipe', label: 'Tipe' },
];

export interface MasterOperasionalCrudModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterOperasionalCrudModal: React.FC<
  MasterOperasionalCrudModalProps
> = ({ isOpen, company, companies, onClose }) => {
  const [activeTab, setActiveTab] =
    useState<MasterOperasionalTabKey>('kategori');

  const {
    allCategories,
    allTypes,
    loading,
    error,
    createCategory,
    updateCategory,
    removeCategory,
    createType,
    updateType,
    removeType,
  } = useMasterOperasionalCrudResource(isOpen, company);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('kategori');
    }
  }, [isOpen]);

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

  const kategoriFields = useMemo<CrudFieldConfig<ExpenseCategory>[]>(
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
        label: 'Nama Kategori',
        placeholder: 'Contoh: Bahan Baku',
      },
    ],
    [companyOptions, defaultCompanyId, renderCompanyName]
  );

  const tipeFields = useMemo<CrudFieldConfig<ExpenseType>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Perusahaan',
        type: 'select',
        placeholder: 'Pilih perusahaan...',
        defaultValue: defaultCompanyId,
        options: companyOptions,
        resetFieldsOnChange: ['expense_category_id'],
        renderValue: (row) => renderCompanyName(row.company_id, row.company),
      },
      {
        key: 'expense_category_id',
        label: 'Pilih Kategori',
        type: 'select',
        placeholder: 'Pilih kategori...',
        disabled: (values) => !values.company_id,
        options: (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          if (!Number.isFinite(companyId)) {
            return [];
          }
          return allCategories
            .filter((cat) => Number(cat.company_id) === companyId)
            .map((cat) => ({
              value: String(cat.id),
              label: cat.name,
            }));
        },
        renderValue: (row) =>
          allCategories.find((c) => c.id === Number(row.expense_category_id))
            ?.name ??
          row.expense_category?.name ??
          String(row.expense_category_id),
      },
      {
        key: 'name',
        label: 'Nama Tipe',
        placeholder: 'Contoh: Dairy',
      },
    ],
    [allCategories, companyOptions, defaultCompanyId, renderCompanyName]
  );

  const tabsBar = (
    <div
      role="tablist"
      aria-label="Master Operasional Tabs"
      data-testid="master-operasional-tabs"
      className="flex flex-wrap items-end gap-1 border-b border-border pl-1"
    >
      {MASTER_OPERASIONAL_TABS.map((tab) => {
        const isSelected = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`master-operasional-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'cursor-pointer rounded-t-lg border px-4 py-1.5 text-xs transition-colors',
              isSelected
                ? 'relative z-10 -mb-px border-border border-b-card bg-card font-bold text-primary shadow-2xs'
                : 'border-transparent bg-muted/60 font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
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
    title: 'Master Operasional',
    subtitle: 'Kelola kategori dan tipe operasional perusahaan',
    testId: 'master-operasional-crud-modal',
    tabs: tabsBar,
    layout: 'split' as const,
    labelPlacement: 'left' as const,
    modalSize: 'expanded' as const,
    pageSize: 10,
    loading,
    error,
    onClose,
  };

  if (activeTab === 'tipe') {
    return (
      <CrudModal
        {...commonCrudProps}
        resetKey={`tipe-${company?.id ?? 0}`}
        fields={tipeFields}
        emptyMessage="Belum ada data tipe operasional."
        items={allTypes}
        onCreate={async (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          const categoryId = parseInt(values.expense_category_id ?? '', 10);
          const name = (values.name ?? '').trim();
          if (Number.isFinite(companyId) && Number.isFinite(categoryId) && name) {
            await createType(categoryId, name, companyId);
          }
        }}
        onUpdate={async (id, values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          const categoryId = parseInt(values.expense_category_id ?? '', 10);
          const name = (values.name ?? '').trim();
          if (Number.isFinite(companyId) && Number.isFinite(categoryId) && name) {
            await updateType(id, categoryId, name, companyId);
          }
        }}
        onDelete={async (id) => {
          await removeType(id);
        }}
      />
    );
  }

  return (
    <CrudModal
      {...commonCrudProps}
      resetKey={`kategori-${company?.id ?? 0}`}
      fields={kategoriFields}
      emptyMessage="Belum ada data kategori operasional."
      items={allCategories}
      onCreate={async (values) => {
        const companyId = parseInt(values.company_id ?? '', 10);
        const name = (values.name ?? '').trim();
        if (Number.isFinite(companyId) && name) {
          await createCategory(name, companyId);
        }
      }}
      onUpdate={async (id, values) => {
        const companyId = parseInt(values.company_id ?? '', 10);
        const name = (values.name ?? '').trim();
        if (Number.isFinite(companyId) && name) {
          await updateCategory(id, name, companyId);
        }
      }}
      onDelete={async (id) => {
        await removeCategory(id);
      }}
    />
  );
};
