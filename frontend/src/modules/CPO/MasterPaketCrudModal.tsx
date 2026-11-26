import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Company,
  DefaultPackage,
  DefaultPackagePayload,
  Packet,
  PacketVendor,
  PacketVendorPayload,
  PacketVendorType,
} from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { DEFAULT_CPO_ENUMS, useMasterPaketCrudResource } from '@/lib/cpoResources';
import { cn } from '@/lib/utils';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import { groupItemPacketsByCompanyAndPacket } from './packingGrouping';

export type MasterPaketTabKey = 'vendor' | 'default-package';

export const MASTER_PAKET_TABS: Array<{
  key: MasterPaketTabKey;
  label: string;
}> = [
  { key: 'vendor', label: 'Vendor' },
  { key: 'default-package', label: 'Paket Awal' },
];

function formatCompanyPacketLabel(
  company: Company | null | undefined,
  companyId: number | null,
  packet: Packet | null | undefined,
  packetId: number,
  packetVendor?: PacketVendor | null,
  packetVendorId?: number | null
): string {
  const ownerName =
    company?.name ??
    packetVendor?.name ??
    (companyId != null
      ? `Perusahaan #${companyId}`
      : `Vendor #${packetVendorId ?? '-'}`);
  const packetName = packet?.name ?? `Paket #${packetId}`;
  return `${ownerName} — ${packetName}`;
}

export interface MasterPaketCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterPaketCrudModal: React.FC<MasterPaketCrudModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<MasterPaketTabKey>('vendor');

  const {
    enums,
    allPacketNames,
    allPacketVendors,
    allPacketCategories,
    allItemPackets,
    allDefaultPackages,
    loading,
    error,
    clearError,
    createPacketVendor,
    updatePacketVendor,
    removePacketVendor,
    createDefaultPackage,
    updateDefaultPackage,
    removeDefaultPackage,
  } = useMasterPaketCrudResource(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('vendor');
      clearError();
    }
  }, [isOpen, clearError]);

  const packetVendorTypes = useMemo(
    () =>
      enums.packet_vendor_type && enums.packet_vendor_type.length > 0
        ? enums.packet_vendor_type
        : (DEFAULT_CPO_ENUMS.packet_vendor_type ?? []),
    [enums.packet_vendor_type]
  );

  const vendorTypeOptions = useMemo(
    () =>
      packetVendorTypes.map((opt) => ({
        value: opt.value,
        label: opt.nama,
      })),
    [packetVendorTypes]
  );

  const vendorTypeLabelMap = useMemo(
    () => new Map(packetVendorTypes.map((opt) => [opt.value, opt.nama])),
    [packetVendorTypes]
  );

  const defaultVendorType: PacketVendorType =
    packetVendorTypes[0]?.value ?? 'Bahan';

  const vendorFields = useMemo<CrudFieldConfig<PacketVendor>[]>(
    () => [
      {
        key: 'name',
        label: 'Nama Vendor',
        placeholder: 'Contoh: PT. Vendor Utama',
      },
      {
        key: 'type',
        label: 'Tipe Vendor',
        type: 'select',
        placeholder: 'Pilih tipe vendor...',
        defaultValue: defaultVendorType,
        options: vendorTypeOptions,
        renderValue: (row) => {
          const typeValue = row.type ?? defaultVendorType;
          return vendorTypeLabelMap.get(typeValue) ?? typeValue;
        },
      },
    ],
    [defaultVendorType, vendorTypeLabelMap, vendorTypeOptions]
  );

  const parseVendorPayload = (
    values: Record<string, string>
  ): PacketVendorPayload | null => {
    const name = (values.name ?? '').trim();
    const rawType = (values.type ?? '').trim();
    const type: PacketVendorType =
      packetVendorTypes.find((opt) => opt.value === rawType)?.value ??
      defaultVendorType;
    if (!name) {
      return null;
    }
    return { name, type };
  };

  const packetNameOptions = useMemo(
    () =>
      allPacketNames.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [allPacketNames]
  );

  const packetVendorOptions = useMemo(
    () =>
      allPacketVendors.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [allPacketVendors]
  );

  const packetCategoryOptions = useMemo(
    () =>
      allPacketCategories.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [allPacketCategories]
  );

  const groupedItemPackets = useMemo(
    () =>
      groupItemPacketsByCompanyAndPacket(
        allItemPackets,
        new Map(),
        new Map()
      ),
    [allItemPackets]
  );

  const getItemPacketOptions = useCallback(
    (values: Record<string, string>) => {
      const selectedId = Number(values.item_packet_id);
      const hasSelected =
        Boolean(values.item_packet_id) && Number.isFinite(selectedId);

      let matchedGroup = false;
      const options = groupedItemPackets.map((group) => {
        const matchesSelected =
          hasSelected &&
          group.item_packets.some((ip) => Number(ip.id) === selectedId);
        if (matchesSelected) {
          matchedGroup = true;
        }
        return {
          value: matchesSelected ? String(selectedId) : String(group.id),
          label: formatCompanyPacketLabel(
            group.company,
            group.company_id,
            group.packet,
            group.packet_id
          ),
        };
      });

      if (hasSelected && !matchedGroup) {
        const fallback =
          allDefaultPackages.find(
            (dp) => Number(dp.item_packet_id) === selectedId
          )?.item_packet ?? null;
        if (fallback) {
          options.push({
            value: String(selectedId),
            label: formatCompanyPacketLabel(
              fallback.company,
              fallback.company_id,
              fallback.packet,
              fallback.packet_id,
              fallback.packet_vendor,
              fallback.packet_vendor_id
            ),
          });
        }
      }

      return options;
    },
    [allDefaultPackages, groupedItemPackets]
  );

  const defaultPackageFields = useMemo<CrudFieldConfig<DefaultPackage>[]>(
    () => [
      {
        key: 'brand_name',
        label: 'Nama Brand',
        placeholder: 'Contoh: Brand Hemat',
      },
      {
        key: 'packet_name_id',
        label: 'Nama Paket',
        type: 'select',
        placeholder: 'Pilih nama paket...',
        options: packetNameOptions,
        renderValue: (row) =>
          allPacketNames.find((p) => p.id === Number(row.packet_name_id))
            ?.name ??
          row.packet_name?.name ??
          String(row.packet_name_id),
      },
      {
        key: 'packet_vendor_id',
        label: 'Vendor Paket',
        type: 'select',
        placeholder: 'Pilih vendor paket...',
        options: packetVendorOptions,
        renderValue: (row) =>
          allPacketVendors.find((v) => v.id === Number(row.packet_vendor_id))
            ?.name ??
          row.packet_vendor?.name ??
          String(row.packet_vendor_id),
      },
      {
        key: 'packet_category_id',
        label: 'Kategori Paket',
        type: 'select',
        placeholder: 'Pilih kategori paket...',
        options: packetCategoryOptions,
        renderValue: (row) =>
          allPacketCategories.find(
            (c) => c.id === Number(row.packet_category_id)
          )?.name ??
          row.packet_category?.name ??
          String(row.packet_category_id),
      },
      {
        key: 'item_packet_id',
        label: 'Item Paket',
        type: 'select',
        placeholder: 'Pilih item paket...',
        options: getItemPacketOptions,
        renderValue: (row) => {
          const matched =
            allItemPackets.find((ip) => ip.id === Number(row.item_packet_id)) ??
            row.item_packet;
          if (!matched) {
            return String(row.item_packet_id);
          }
          const group = groupedItemPackets.find(
            (g) =>
              g.company_id === Number(matched.company_id) &&
              g.packet_id === Number(matched.packet_id)
          );
          return formatCompanyPacketLabel(
            matched.company ?? group?.company,
            matched.company_id,
            matched.packet ?? group?.packet,
            Number(matched.packet_id),
            matched.packet_vendor,
            matched.packet_vendor_id
          );
        },
      },
      {
        key: 'price',
        label: 'Harga (Rp)',
        type: 'decimal',
        optional: true,
        defaultValue: '0',
        placeholder: 'Contoh: 150.000',
        renderValue: (row) => formatCapitalIdr(Number(row.price ?? 0)),
      },
    ],
    [
      allItemPackets,
      allPacketCategories,
      allPacketNames,
      allPacketVendors,
      getItemPacketOptions,
      groupedItemPackets,
      packetCategoryOptions,
      packetNameOptions,
      packetVendorOptions,
    ]
  );

  const parseDefaultPackagePayload = (
    values: Record<string, string>
  ): DefaultPackagePayload | null => {
    const brandName = (values.brand_name ?? '').trim();
    const packetNameId = parseInt(values.packet_name_id ?? '', 10);
    const packetVendorId = parseInt(values.packet_vendor_id ?? '', 10);
    const packetCategoryId = parseInt(values.packet_category_id ?? '', 10);
    const itemPacketId = parseInt(values.item_packet_id ?? '', 10);
    const price = values.price ? parseFloat(values.price) : 0;
    if (
      !brandName ||
      !Number.isFinite(packetNameId) ||
      !Number.isFinite(packetVendorId) ||
      !Number.isFinite(packetCategoryId) ||
      !Number.isFinite(itemPacketId) ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return null;
    }
    return {
      brand_name: brandName,
      packet_name_id: packetNameId,
      packet_vendor_id: packetVendorId,
      packet_category_id: packetCategoryId,
      item_packet_id: itemPacketId,
      price: Math.round(price * 100) / 100,
    };
  };

  const tabsBar = (
    <div
      role="tablist"
      aria-label="Master Paket Tabs"
      data-testid="master-paket-tabs"
      className="flex shrink-0 flex-wrap items-end gap-1 border-b border-border pl-1"
    >
      {MASTER_PAKET_TABS.map((tab) => {
        const isSelected = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            data-testid={`master-paket-tab-${tab.key}`}
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
    title: 'Master Paket',
    subtitle: 'Kelola vendor paket dan paket awal',
    testId: 'master-paket-crud-modal',
    tabs: tabsBar,
    layout: 'split' as const,
    labelPlacement: 'left' as const,
    modalSize: 'expanded' as const,
    pageSize: 10,
    loading,
    error,
    onClose,
  };

  if (activeTab === 'default-package') {
    return (
      <CrudModal
        {...commonCrudProps}
        resetKey="default-package"
        fields={defaultPackageFields}
        emptyMessage="Belum ada data paket awal."
        items={allDefaultPackages}
        onCreate={async (values) => {
          const payload = parseDefaultPackagePayload(values);
          if (payload) {
            await createDefaultPackage(payload);
          }
        }}
        onUpdate={async (id, values) => {
          const payload = parseDefaultPackagePayload(values);
          if (payload) {
            await updateDefaultPackage(id, payload);
          }
        }}
        onDelete={async (id) => {
          await removeDefaultPackage(id);
        }}
      />
    );
  }

  return (
    <CrudModal
      {...commonCrudProps}
      resetKey="vendor"
      fields={vendorFields}
      emptyMessage="Belum ada data vendor."
      items={allPacketVendors}
      onCreate={async (values) => {
        const payload = parseVendorPayload(values);
        if (payload) {
          await createPacketVendor(payload);
        }
      }}
      onUpdate={async (id, values) => {
        const payload = parseVendorPayload(values);
        if (payload) {
          await updatePacketVendor(id, payload);
        }
      }}
      onDelete={async (id) => {
        await removePacketVendor(id);
      }}
    />
  );
};
