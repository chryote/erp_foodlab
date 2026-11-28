import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  Item,
  ItemPayload,
  ItemType,
  PacketVendor,
} from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { DEFAULT_CPO_ENUMS, useItemCrudResource } from '@/lib/cpoResources';
import { cn } from '@/lib/utils';

const HIDDEN_ITEM_VENDOR_TYPES = new Set<string>(['Kelengkapan', 'Sarpras']);

export interface MasterItemVendorCrudModalProps {
  isOpen: boolean;
  pageMode?: boolean;
  company?: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterItemVendorCrudModal: React.FC<
  MasterItemVendorCrudModalProps
> = ({ isOpen, pageMode = false, onClose }) => {
  const {
    enums,
    allItems,
    allPacketVendors,
    loading,
    error,
    clearError,
    createItem,
    updateItem,
    removeItem,
    pageQuery,
  } = useItemCrudResource(isOpen, pageMode);

  const tabs = useMemo(() => {
    const source =
      enums.item_type.length > 0
        ? enums.item_type
        : DEFAULT_CPO_ENUMS.item_type;
    const visible = source.filter(
      (tab) => !HIDDEN_ITEM_VENDOR_TYPES.has(tab.value)
    );
    return visible.length > 0 ? visible : [{ value: 'Bahan', nama: 'Bahan' }];
  }, [enums.item_type]);

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

  const packetVendorsById = useMemo(() => {
    const map = new Map<number, PacketVendor>();
    for (const vendor of allPacketVendors) {
      map.set(Number(vendor.id), vendor);
    }
    return map;
  }, [allPacketVendors]);

  const matchingVendors = useMemo<PacketVendor[]>(
    () =>
      allPacketVendors.filter(
        (vendor) => (vendor.type ?? 'Bahan') === activeItemType
      ),
    [allPacketVendors, activeItemType]
  );

  const vendorOptions = useMemo(
    () =>
      matchingVendors.map((vendor) => ({
        value: String(vendor.id),
        label: vendor.name,
      })),
    [matchingVendors]
  );

  const renderVendorName = useMemo(
    () =>
      (
        packetVendorId: number | null | undefined,
        fallbackVendor?: PacketVendor | null
      ) =>
        packetVendorsById.get(Number(packetVendorId))?.name ??
        fallbackVendor?.name ??
        String(packetVendorId ?? ''),
    [packetVendorsById]
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
        if (item.type !== activeItemType || item.packet_vendor_id == null) {
          return false;
        }
        const vendorType =
          packetVendorsById.get(Number(item.packet_vendor_id))?.type ??
          item.packet_vendor?.type ??
          'Bahan';
        return vendorType === activeItemType;
      }),
    [activeItemType, allItems, packetVendorsById]
  );

  const itemFields = useMemo<CrudFieldConfig<Item>[]>(
    () => [
      {
        key: 'packet_vendor_id',
        label: 'Pilih Vendor',
        type: 'select',
        placeholder: 'Pilih vendor...',
        defaultValue: '',
        options: vendorOptions,
        renderValue: (row) =>
          renderVendorName(row.packet_vendor_id, row.packet_vendor),
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
        placeholder: 'Contoh: Kardus Kemasan 30x20',
      },
    ],
    [
      activeItemType,
      itemTypeLabelMap,
      itemTypeOptions,
      renderVendorName,
      vendorOptions,
    ]
  );

  const parseItemPayload = (
    values: Record<string, string>
  ): ItemPayload | null => {
    const packetVendorId = parseInt(values.packet_vendor_id ?? '', 10);
    const code = (values.code ?? '').trim();
    const name = (values.name ?? '').trim();
    if (!Number.isFinite(packetVendorId) || !name) {
      return null;
    }
    return {
      packet_vendor_id: packetVendorId,
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
      pageMode={pageMode}
      title="Master Item Vendor"
      subtitle="Kelola item vendor berdasarkan tipe item dan vendor paket"
      testId="master-item-vendor-crud-modal"
      tabs={tabsBar}
      resetKey={activeItemType}
      layout="split"
      labelPlacement="left"
      modalSize="expanded"
      pageSize={10}
      fields={itemFields}
      emptyMessage={`Belum ada data item ${activeItemTypeLabel.toLowerCase()}.`}
      items={filteredItems}
      displayItems={pageMode ? filteredItems : undefined}
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
        pageMode && pageQuery.isFetchNextPageError
          ? 'Gagal memuat item berikutnya.'
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
