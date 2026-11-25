import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  Item,
  ItemPayload,
  ItemType,
} from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { DEFAULT_CPO_ENUMS, useItemCrudResource } from '@/lib/cpoResources';
import { cn } from '@/lib/utils';

export interface MasterItemVendorCrudModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterItemVendorCrudModal: React.FC<
  MasterItemVendorCrudModalProps
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

  const availableCompanies = useMemo<Company[]>(() => {
    if (companies && companies.length > 0) {
      return companies;
    }
    return company ? [company] : [];
  }, [companies, company]);

  const vendorCompanies = useMemo<Company[]>(
    () => availableCompanies.filter((c) => c.type === activeItemType),
    [availableCompanies, activeItemType]
  );

  const defaultCompanyId = useMemo(() => {
    if (company && vendorCompanies.some((c) => c.id === company.id)) {
      return String(company.id);
    }
    return '';
  }, [company, vendorCompanies]);

  const companyOptions = useMemo(
    () =>
      vendorCompanies.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [vendorCompanies]
  );

  const renderCompanyName = useMemo(
    () => (companyId: number | undefined, fallbackCompany?: Company | null) =>
      availableCompanies.find((c) => c.id === Number(companyId))?.name ??
      fallbackCompany?.name ??
      String(companyId ?? ''),
    [availableCompanies]
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
      allItems.filter((item) => {
        if (item.type !== activeItemType) {
          return false;
        }
        const companyType =
          availableCompanies.find(
            (c) => Number(c.id) === Number(item.company_id)
          )?.type ?? item.company?.type;
        return companyType === activeItemType;
      }),
    [activeItemType, allItems, availableCompanies]
  );

  const itemFields = useMemo<CrudFieldConfig<Item>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Vendor',
        type: 'select',
        placeholder: 'Pilih vendor...',
        defaultValue: defaultCompanyId,
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
        hideInForm: activeItemType === 'Sarpras',
        hideInTable: activeItemType === 'Sarpras',
        placeholder: 'Contoh: ITM-001',
        renderValue: (row) => row.code || '-',
      },
      {
        key: 'name',
        label: 'Nama Item',
        placeholder: 'Contoh: Kardus Kemasan 30x20',
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
    const companyId = parseInt(values.company_id ?? '', 10);
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
      aria-label="Tab Master Item Vendor"
      data-testid="master-item-vendor-tabs"
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
            data-testid={`master-item-vendor-tab-${tab.value}`}
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
      title="Master Item Vendor"
      subtitle="Kelola item vendor berdasarkan tipe item dan perusahaan vendor"
      testId="master-item-vendor-crud-modal"
      tabs={tabsBar}
      resetKey={`${activeItemType}-${company?.id ?? 0}`}
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
