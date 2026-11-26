import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
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
import {
  useInfiniteItemPacketsQuery,
  useInfiniteItemsQuery,
  useInfinitePacketsQuery,
} from '@/lib/cpoResources';

export type MasterPackingTabKey = 'item' | 'packet' | 'assignment';

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
  pageMode?: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterPackingCrudModal: React.FC<
  MasterPackingCrudModalProps
> = ({ isOpen, pageMode = false, company, companies, onClose }) => {
  const [activeTab, setActiveTab] = useState<MasterPackingTabKey>('item');
  const [sort, setSort] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>({ key: 'name', direction: 'asc' });

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
  } = useMasterPackingCrudResource(isOpen, company, !pageMode);
  const itemSortParam = `${sort?.direction === 'desc' ? '-' : ''}${sort?.key ?? 'name'},id`;
  const packetSortParam = `${sort?.direction === 'desc' ? '-' : ''}${sort?.key ?? 'name'},id`;
  const itemPacketSortParam = `${sort?.direction === 'desc' ? '-' : ''}${sort?.key ?? 'id'}`;
  const itemsPageQuery = useInfiniteItemsQuery(
    company?.id ?? null,
    itemSortParam,
    pageMode
  );
  const packetsPageQuery = useInfinitePacketsQuery(
    packetSortParam,
    pageMode
  );
  const itemPacketsPageQuery = useInfiniteItemPacketsQuery(
    company?.id ?? null,
    itemPacketSortParam,
    pageMode
  );
  const activeListQuery =
    activeTab === 'item'
      ? itemsPageQuery
      : activeTab === 'packet'
        ? packetsPageQuery
        : itemPacketsPageQuery;
  const itemPageItems =
    itemsPageQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const packetPageItems =
    packetsPageQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const itemPacketPageItems =
    itemPacketsPageQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const itemsForForm = pageMode ? itemPageItems : allItems;
  const packetsForForm = pageMode ? packetPageItems : allPackets;
  const pageItems =
    activeTab === 'item'
      ? itemPageItems
      : activeTab === 'packet'
        ? packetPageItems
        : itemPacketPageItems;

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('item');
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
    () =>
      (companyId: number | null | undefined, fallbackCompany?: Company | null) =>
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
        sortable: true,
        type: 'select',
        placeholder: 'Pilih vendor...',
        defaultValue: defaultCompanyId,
        options: companyOptions,
        renderValue: (row) => renderCompanyName(row.company_id, row.company),
      },
      {
        key: 'type',
        label: 'Tipe Item',
        sortable: true,
        type: 'select',
        placeholder: 'Pilih tipe item...',
        defaultValue: defaultItemType,
        options: itemTypeOptions,
        renderValue: (row) => itemTypeLabelMap.get(row.type) ?? row.type,
      },
      {
        key: 'code',
        label: 'Kode Item',
        sortable: true,
        optional: true,
        placeholder: 'Contoh: ITM-001',
        renderValue: (row) => row.code || '-',
      },
      {
        key: 'name',
        label: 'Nama Item',
        sortable: true,
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
        sortable: true,
        placeholder: 'Contoh: Paket Hemat Pemula',
      },
    ],
    []
  );

  const packetOptions = useMemo(
    () =>
      packetsForForm.map((packet) => ({
        value: String(packet.id),
        label: packet.name,
      })),
    [packetsForForm]
  );

  const assignmentFields = useMemo<CrudFieldConfig<ItemPacket>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Vendor',
        sortable: true,
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
        sortable: true,
        type: 'select',
        placeholder: 'Pilih paket...',
        options: packetOptions,
        renderValue: (row) =>
          packetsForForm.find((p) => p.id === Number(row.packet_id))?.name ??
          row.packet?.name ??
          String(row.packet_id),
      },
      {
        key: 'item_id',
        label: 'Pilih Item',
        sortable: true,
        type: 'select',
        placeholder: 'Pilih item...',
        disabled: (values) => !values.company_id,
        options: (values) => {
          const companyId = parseInt(values.company_id ?? '', 10);
          if (!Number.isFinite(companyId)) {
            return [];
          }
          return itemsForForm
            .filter(
              (item) =>
                item.company_id !== null && Number(item.company_id) === companyId
            )
            .map((item) => ({
              value: String(item.id),
              label: `${item.name} (${item.type})`,
            }));
        },
        renderValue: (row) => {
          const matched =
            itemsForForm.find((item) => item.id === Number(row.item_id)) ?? row.item;
          return matched
            ? `${matched.name} (${matched.type})`
            : String(row.item_id);
        },
      },
      {
        key: 'quantity',
        label: 'Jumlah',
        sortable: true,
        type: 'number',
        min: 1,
        step: 1,
        defaultValue: '1',
        placeholder: 'Contoh: 1',
        renderValue: (row) => String(row.quantity),
      },
    ],
    [
      itemsForForm,
      packetsForForm,
      companyOptions,
      defaultCompanyId,
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
              setSort(
                tab.key === 'item'
                  ? { key: 'name', direction: 'asc' }
                  : tab.key === 'packet'
                    ? { key: 'name', direction: 'asc' }
                    : { key: 'id', direction: 'asc' }
              );
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
    pageMode,
    title: 'Master Packing',
    subtitle: 'Kelola item, paket, dan komposisi item paket perusahaan',
    testId: 'master-packing-crud-modal',
    tabs: tabsBar,
    layout: 'split' as const,
    labelPlacement: 'left' as const,
    modalSize: 'expanded' as const,
    pageSize: 10,
    loading: pageMode ? activeListQuery.isLoading || loading : loading,
    error:
      pageMode && activeListQuery.error instanceof Error
        ? activeListQuery.error.message
        : error,
    hasMore: pageMode && Boolean(activeListQuery.hasNextPage),
    onLoadMore: pageMode
      ? () => {
          if (activeListQuery.hasNextPage && !activeListQuery.isFetchingNextPage) {
            void activeListQuery.fetchNextPage();
          }
        }
      : undefined,
    isLoadingMore: pageMode && activeListQuery.isFetchingNextPage,
    loadMoreError: activeListQuery.isFetchNextPageError
      ? 'Gagal memuat data berikutnya.'
      : null,
    onRetryLoadMore: pageMode
      ? () => {
          if (activeListQuery.isFetchNextPageError) {
            void activeListQuery.fetchNextPage();
          }
        }
      : undefined,
    sortKey: sort?.key ?? (activeTab === 'assignment' ? 'id' : 'name'),
    sortDirection: sort?.direction ?? 'asc',
    onSort: pageMode
      ? (key: string) => {
          const allowed =
            activeTab === 'item'
              ? ['code', 'name', 'type', 'company_id']
              : activeTab === 'packet'
                ? ['name']
                : ['company_id', 'packet_id', 'item_id', 'quantity'];
          if (!allowed.includes(key)) {
            return;
          }
          setSort((current) =>
            current?.key === key
              ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
              : { key, direction: 'asc' }
          );
        }
      : undefined,
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
        displayItems={pageMode ? pageItems as Packet[] : undefined}
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
        items={allItemPackets}
        displayItems={pageMode ? pageItems as ItemPacket[] : undefined}
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
      items={allItems}
      displayItems={pageMode ? pageItems as Item[] : undefined}
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
