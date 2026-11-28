import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  Item,
  ItemPayload,
  ItemType,
} from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { DEFAULT_CPO_ENUMS, useItemCrudResource } from '@/lib/cpoResources';
import { cn } from '@/lib/utils';

export interface MasterItemInternalCrudModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterItemInternalCrudModal: React.FC<
  MasterItemInternalCrudModalProps
> = ({ isOpen, company, companies, onClose }) => {
  const {
    enums,
    allItems,
    loading,
    error,
    clearError,
    createItem,
    updateItem,
    removeItem,
  } = useItemCrudResource(isOpen);

  const tabs = useMemo(
    () =>
      enums.item_type.length > 0
        ? enums.item_type
        : DEFAULT_CPO_ENUMS.item_type,
    [enums.item_type]
  );

  const defaultTab = tabs[0]?.value ?? 'Bahan';
  const [activeTab, setActiveTab] = useState<ItemType>(defaultTab);

  const activeItemType = useMemo<ItemType>(() => {
    if (tabs.some((tab) => tab.value === activeTab)) {
      return activeTab;
    }
    return defaultTab;
  }, [activeTab, defaultTab, tabs]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab(defaultTab);
      clearError();
    }
  }, [isOpen, defaultTab, clearError]);

  const activeCompany = useMemo<Company | null>(() => {
    if (company) {
      return company;
    }
    const activeCompanyId = getActiveCompanyId();
    if (activeCompanyId !== null && companies && companies.length > 0) {
      return companies.find((c) => c.id === activeCompanyId) ?? null;
    }
    return null;
  }, [companies, company]);

  const availableCompanies = useMemo<Company[]>(() => {
    if (companies && companies.length > 0) {
      return companies;
    }
    return activeCompany ? [activeCompany] : [];
  }, [companies, activeCompany]);

  const companiesById = useMemo(() => {
    const map = new Map<number, Company>();
    for (const item of availableCompanies) {
      map.set(Number(item.id), item);
    }
    return map;
  }, [availableCompanies]);

  const defaultCompanyId = activeCompany ? String(activeCompany.id) : '';

  const companyOptions = useMemo(
    () =>
      activeCompany
        ? [{ value: String(activeCompany.id), label: activeCompany.name }]
        : [],
    [activeCompany]
  );

  const renderCompanyName = useMemo(
    () =>
      (companyId: number | null | undefined, fallbackCompany?: Company | null) =>
        companiesById.get(Number(companyId))?.name ??
        fallbackCompany?.name ??
        String(companyId ?? ''),
    [companiesById]
  );

  const itemTypeOptions = useMemo(
    () =>
      tabs.map((opt) => ({
        value: opt.value,
        label: opt.nama,
      })),
    [tabs]
  );

  const itemTypeLabelMap = useMemo(
    () => new Map(tabs.map((opt) => [opt.value, opt.nama])),
    [tabs]
  );

  const activeItemTypeLabel =
    itemTypeLabelMap.get(activeItemType) ?? activeItemType;

  const filteredItems = useMemo<Item[]>(
    () =>
      allItems.filter(
        (item) =>
          item.type === activeItemType &&
          item.company_id != null &&
          item.packet_vendor_id == null
      ),
    [activeItemType, allItems]
  );

  const itemFields = useMemo<CrudFieldConfig<Item>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Perusahaan',
        type: 'select',
        placeholder: 'Pilih perusahaan...',
        defaultValue: defaultCompanyId,
        disabled: true,
        options: companyOptions,
        renderValue: (row) => renderCompanyName(row.company_id, row.company),
      },
      {
        key: 'type',
        label: 'Tipe Item',
        type: 'select',
        placeholder: 'Pilih tipe item...',
        defaultValue: activeItemType,
        disabled: true,
        hideInForm: true,
        options: itemTypeOptions,
        renderValue: (row) => itemTypeLabelMap.get(row.type) ?? row.type,
      },
      {
        key: 'code',
        label: 'Kode Item',
        optional: true,
        placeholder: 'Contoh: ITM-001',
        renderValue: (row) => row.code || '-',
      },
      {
        key: 'name',
        label: 'Nama Item',
        placeholder: 'Contoh: Tepung Terigu 1kg',
      },
    ],
    [
      activeItemType,
      companyOptions,
      defaultCompanyId,
      itemTypeLabelMap,
      itemTypeOptions,
      renderCompanyName,
    ]
  );

  const parseItemPayload = (
    values: Record<string, string>
  ): ItemPayload | null => {
    const companyId = activeCompany?.id ?? parseInt(values.company_id ?? '', 10);
    const code = (values.code ?? '').trim();
    const name = (values.name ?? '').trim();
    if (!Number.isFinite(companyId) || !name) {
      return null;
    }
    return {
      company_id: companyId,
      code: code || null,
      name,
      type: activeItemType,
    };
  };

  const tabsBar = (
    <div
      role="tablist"
      aria-label="Tab Master Item Internal"
      data-testid="master-item-internal-tabs"
      className="flex flex-wrap items-end gap-1 border-b border-border pl-1"
    >
      {tabs.map((tab) => {
        const isSelected = tab.value === activeItemType;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`master-item-internal-tab-${tab.value}`}
            onClick={() => {
              clearError();
              setActiveTab(tab.value);
            }}
            className={cn(
              'cursor-pointer rounded-t-lg border px-4 py-1.5 text-xs transition-colors',
              isSelected
                ? 'relative z-10 -mb-px border-border border-b-card bg-card font-bold text-primary shadow-2xs'
                : 'border-transparent bg-muted/60 font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.nama}
          </button>
        );
      })}
    </div>
  );

  return (
    <CrudModal
      isOpen={isOpen}
      title="Master Item Internal"
      subtitle="Kelola item internal berdasarkan tipe item dan perusahaan"
      testId="master-item-internal-crud-modal"
      tabs={tabsBar}
      resetKey={`${activeItemType}-${activeCompany?.id ?? 0}`}
      layout="split"
      labelPlacement="left"
      modalSize="expanded"
      pageSize={10}
      fields={itemFields}
      emptyMessage={`Belum ada data item ${activeItemTypeLabel.toLowerCase()}.`}
      items={filteredItems}
      loading={loading}
      error={error}
      onClose={onClose}
      onCreate={async (values) => {
        const payload = parseItemPayload(values);
        if (payload) {
          await createItem(payload);
        }
      }}
      onUpdate={async (id, values) => {
        const payload = parseItemPayload(values);
        if (payload) {
          await updateItem(id, payload);
        }
      }}
      onDelete={async (id) => {
        await removeItem(id);
      }}
    />
  );
};
