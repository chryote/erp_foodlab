import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Company,
  CompanyType,
  Item,
  ItemPacket,
  ItemPacketPayload,
  ItemPayload,
  ItemType,
  Packet,
  PacketPayload,
} from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { useMasterPackingCrudResource } from '@/lib/cpoResources';
import { cn } from '@/lib/utils';

export type MasterPackingTabKey = 'item' | 'packet' | 'assignment';

export const ALLOWED_PACKING_COMPANY_TYPES: ReadonlySet<CompanyType> = new Set([
  'Utama',
  'Packing',
]);

export const MASTER_PACKING_TABS: Array<{
  key: MasterPackingTabKey;
  label: string;
}> = [
  { key: 'item', label: 'Item' },
  { key: 'packet', label: 'Paket' },
  { key: 'assignment', label: 'Item Paket' },
];

export interface MasterPackingCrudModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterPackingCrudModal: React.FC<
  MasterPackingCrudModalProps
> = ({ isOpen, company, companies, onClose }) => {
  const [activeTab, setActiveTab] = useState<MasterPackingTabKey>('item');

  const {
    enums,
    allItems,
    allPackets,
    allItemPackets,
    loading,
    error,
    clearError,
    createItem,
    updateItem,
    removeItem,
    createPacket,
    updatePacket,
    removePacket,
    createItemPacket,
    updateItemPacket,
    removeItemPacket,
  } = useMasterPackingCrudResource(isOpen, company);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('item');
      clearError();
    }
  }, [isOpen, clearError]);

  const allCompaniesById = useMemo(() => {
    const map = new Map<number, Company>();
    for (const c of companies ?? []) {
      map.set(Number(c.id), c);
    }
    if (company) {
      map.set(Number(company.id), company);
    }
    return map;
  }, [companies, company]);

  const isAllowedPackingCompany = useCallback(
    (companyId: number | undefined, fallbackCompany?: Company | null): boolean => {
      const matched =
        allCompaniesById.get(Number(companyId)) ?? fallbackCompany;
      if (!matched) {
        return false;
      }
      return ALLOWED_PACKING_COMPANY_TYPES.has(matched.type ?? 'Utama');
    },
    [allCompaniesById]
  );

  const availableCompanies = useMemo<Company[]>(() => {
    const source =
      companies && companies.length > 0
        ? companies
        : company
          ? [company]
          : [];
    return source.filter((c) =>
      ALLOWED_PACKING_COMPANY_TYPES.has(c.type ?? 'Utama')
    );
  }, [companies, company]);

  const defaultCompanyId =
    company && availableCompanies.some((c) => c.id === company.id)
      ? String(company.id)
      : '';

  const filteredItems = useMemo(
    () =>
      allItems.filter((item) =>
        isAllowedPackingCompany(item.company_id, item.company)
      ),
    [allItems, isAllowedPackingCompany]
  );

  const filteredItemPackets = useMemo(
    () =>
      allItemPackets.filter((assignment) =>
        isAllowedPackingCompany(assignment.company_id, assignment.company)
      ),
    [allItemPackets, isAllowedPackingCompany]
  );

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

  const itemTypeOptions = useMemo(
    () =>
      enums.item_type.map((opt) => ({
        value: opt.value,
        label: opt.nama,
      })),
    [enums.item_type]
  );

  const itemTypeLabelMap = useMemo(
    () => new Map(enums.item_type.map((opt) => [opt.value, opt.nama])),
    [enums.item_type]
  );

  const defaultItemType = enums.item_type[0]?.value ?? 'Bahan';

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
        defaultValue: defaultItemType,
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
        placeholder: 'Contoh: Kardus Kemasan 30x20',
      },
    ],
    [
      companyOptions,
      defaultCompanyId,
      defaultItemType,
      itemTypeLabelMap,
      itemTypeOptions,
      renderCompanyName,
    ]
  );

  const packetFields = useMemo<CrudFieldConfig<Packet>[]>(
    () => [
      {
        key: 'name',
        label: 'Nama Paket',
        placeholder: 'Contoh: Paket Hemat Pemula',
      },
    ],
    []
  );

  const packetOptions = useMemo(
    () =>
      allPackets.map((packet) => ({
        value: String(packet.id),
        label: packet.name,
      })),
    [allPackets]
  );

  const assignmentFields = useMemo<CrudFieldConfig<ItemPacket>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Vendor',
        type: 'select',
        placeholder: 'Pilih vendor...',
        defaultValue: defaultCompanyId,
        options: companyOptions,
        resetFieldsOnChange: ['item_id'],
        renderValue: (row) => renderCompanyName(row.company_id, row.company),
      },
      {
        key: 'packet_id',
        label: 'Pilih Paket',
        type: 'select',
        placeholder: 'Pilih paket...',
        options: packetOptions,
        renderValue: (row) =>
          allPackets.find((p) => p.id === Number(row.packet_id))?.name ??
          row.packet?.name ??
          String(row.packet_id),
      },
      {
        key: 'item_id',
        label: 'Pilih Item',
        type: 'select',
        placeholder: 'Pilih item...',
        disabled: (values) => !values.company_id,
        options: (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          if (!Number.isFinite(companyId)) {
            return [];
          }
          return filteredItems
            .filter((item) => Number(item.company_id) === companyId)
            .map((item) => ({
              value: String(item.id),
              label: `${item.name} (${item.type})`,
            }));
        },
        renderValue: (row) => {
          const matched =
            filteredItems.find((item) => item.id === Number(row.item_id)) ??
            allItems.find((item) => item.id === Number(row.item_id)) ??
            row.item;
          return matched
            ? `${matched.name} (${matched.type})`
            : String(row.item_id);
        },
      },
      {
        key: 'quantity',
        label: 'Jumlah',
        type: 'number',
        min: 1,
        step: 1,
        defaultValue: '1',
        placeholder: 'Contoh: 1',
        renderValue: (row) => String(row.quantity),
      },
    ],
    [
      allItems,
      allPackets,
      companyOptions,
      defaultCompanyId,
      filteredItems,
      packetOptions,
      renderCompanyName,
    ]
  );

  const tabsBar = (
    <div
      role="tablist"
      aria-label="Tab Master Packing"
      data-testid="master-packing-tabs"
      className="flex flex-wrap items-end gap-1 border-b border-border pl-1"
    >
      {MASTER_PACKING_TABS.map((tab) => {
        const isSelected = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`master-packing-tab-${tab.key}`}
            onClick={() => {
              clearError();
              setActiveTab(tab.key);
            }}
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
    title: 'Master Packing',
    subtitle: 'Kelola item, paket, dan komposisi item paket perusahaan',
    testId: 'master-packing-crud-modal',
    tabs: tabsBar,
    layout: 'split' as const,
    labelPlacement: 'left' as const,
    modalSize: 'expanded' as const,
    pageSize: 10,
    loading,
    error,
    onClose,
  };

  const parseItemPayload = (
    values: Record<string, string>
  ): ItemPayload | null => {
    const companyId = parseInt(values.company_id ?? '', 10);
    const code = (values.code ?? '').trim();
    const name = (values.name ?? '').trim();
    const rawType = (values.type ?? '').trim();
    const type: ItemType =
      enums.item_type.find((opt) => opt.value === rawType)?.value ??
      defaultItemType;
    if (!Number.isFinite(companyId) || !name) {
      return null;
    }
    return {
      company_id: companyId,
      code: code || null,
      name,
      type,
    };
  };

  const parsePacketPayload = (
    values: Record<string, string>
  ): PacketPayload | null => {
    const name = (values.name ?? '').trim();
    if (!name) {
      return null;
    }
    return { name };
  };

  const parseItemPacketPayload = (
    values: Record<string, string>
  ): ItemPacketPayload | null => {
    const companyId = parseInt(values.company_id ?? '', 10);
    const packetId = parseInt(values.packet_id ?? '', 10);
    const itemId = parseInt(values.item_id ?? '', 10);
    const quantity = parseInt(values.quantity ?? '', 10);
    if (
      !Number.isFinite(companyId) ||
      !Number.isFinite(packetId) ||
      !Number.isFinite(itemId) ||
      !Number.isFinite(quantity) ||
      quantity < 1
    ) {
      return null;
    }
    return {
      company_id: companyId,
      packet_id: packetId,
      item_id: itemId,
      quantity,
    };
  };

  if (activeTab === 'packet') {
    return (
      <CrudModal
        {...commonCrudProps}
        resetKey="packet"
        fields={packetFields}
        emptyMessage="Belum ada data paket."
        items={allPackets}
        onCreate={async (values) => {
          const payload = parsePacketPayload(values);
          if (payload) {
            await createPacket(payload);
          }
        }}
        onUpdate={async (id, values) => {
          const payload = parsePacketPayload(values);
          if (payload) {
            await updatePacket(id, payload);
          }
        }}
        onDelete={async (id) => {
          await removePacket(id);
        }}
      />
    );
  }

  if (activeTab === 'assignment') {
    return (
      <CrudModal
        {...commonCrudProps}
        resetKey={`assignment-${company?.id ?? 0}`}
        fields={assignmentFields}
        emptyMessage="Belum ada data item paket."
        items={filteredItemPackets}
        onCreate={async (values) => {
          const payload = parseItemPacketPayload(values);
          if (payload) {
            await createItemPacket(payload);
          }
        }}
        onUpdate={async (id, values) => {
          const payload = parseItemPacketPayload(values);
          if (payload) {
            await updateItemPacket(id, payload);
          }
        }}
        onDelete={async (id) => {
          await removeItemPacket(id);
        }}
      />
    );
  }

  return (
    <CrudModal
      {...commonCrudProps}
      resetKey={`item-${company?.id ?? 0}`}
      fields={itemFields}
      emptyMessage="Belum ada data item."
      items={filteredItems}
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
