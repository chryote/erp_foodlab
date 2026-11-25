import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Company,
  DefaultPackage,
  DefaultPackagePayload,
  Packet,
  PacketCategory,
  PacketName,
  PacketVendor,
} from '@/api/client';
import { type CrudFieldConfig, CrudModal } from '@/components/ui';
import { useMasterPaketCrudResource } from '@/lib/cpoResources';
import { cn } from '@/lib/utils';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import { groupItemPacketsByCompanyAndPacket } from './packingGrouping';

export type MasterPaketTabKey = 'paket' | 'default-package';

export const MASTER_PAKET_TABS: Array<{
  key: MasterPaketTabKey;
  label: string;
}> = [
  { key: 'paket', label: 'Paket' },
  { key: 'default-package', label: 'Paket Awal' },
];

interface CombinedPaketRow {
  id: number;
  packet_name: string;
  packet_vendor: string;
  packet_category: string;
  packetNameRecord: PacketName | null;
  packetVendorRecord: PacketVendor | null;
  packetCategoryRecord: PacketCategory | null;
}

function formatCompanyPacketLabel(
  company: Company | null | undefined,
  companyId: number,
  packet: Packet | null | undefined,
  packetId: number
): string {
  const companyName = company?.name ?? `Perusahaan #${companyId}`;
  const packetName = packet?.name ?? `Paket #${packetId}`;
  return `${companyName} — ${packetName}`;
}

export interface MasterPaketCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterPaketCrudModal: React.FC<MasterPaketCrudModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<MasterPaketTabKey>('paket');

  const {
    allPacketNames,
    allPacketVendors,
    allPacketCategories,
    allItemPackets,
    allDefaultPackages,
    loading,
    error,
    clearError,
    createPacketName,
    updatePacketName,
    removePacketName,
    createPacketVendor,
    updatePacketVendor,
    removePacketVendor,
    createPacketCategory,
    updatePacketCategory,
    removePacketCategory,
    createDefaultPackage,
    updateDefaultPackage,
    removeDefaultPackage,
  } = useMasterPaketCrudResource(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('paket');
      clearError();
    }
  }, [isOpen, clearError]);

  const combinedPaketRows = useMemo<CombinedPaketRow[]>(() => {
    const rowCount = Math.max(
      allPacketNames.length,
      allPacketVendors.length,
      allPacketCategories.length
    );
    const rows: CombinedPaketRow[] = [];
    for (let index = 0; index < rowCount; index += 1) {
      const packetNameRecord = allPacketNames[index] ?? null;
      const packetVendorRecord = allPacketVendors[index] ?? null;
      const packetCategoryRecord = allPacketCategories[index] ?? null;
      rows.push({
        id: index + 1,
        packet_name: packetNameRecord?.name ?? '',
        packet_vendor: packetVendorRecord?.name ?? '',
        packet_category: packetCategoryRecord?.name ?? '',
        packetNameRecord,
        packetVendorRecord,
        packetCategoryRecord,
      });
    }
    return rows;
  }, [allPacketCategories, allPacketNames, allPacketVendors]);

  const paketFields = useMemo<CrudFieldConfig<CombinedPaketRow>[]>(
    () => [
      {
        key: 'packet_name',
        label: 'Nama Paket',
        optional: true,
        placeholder: 'Contoh: Paket Hemat',
        renderValue: (row) => row.packet_name || '-',
      },
      {
        key: 'packet_vendor',
        label: 'Vendor Paket',
        optional: true,
        placeholder: 'Contoh: Vendor Utama',
        renderValue: (row) => row.packet_vendor || '-',
      },
      {
        key: 'packet_category',
        label: 'Kategori Paket',
        optional: true,
        placeholder: 'Contoh: Kategori Reguler',
        renderValue: (row) => row.packet_category || '-',
      },
    ],
    []
  );

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
              fallback.packet_id
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
            Number(matched.company_id),
            matched.packet ?? group?.packet,
            Number(matched.packet_id)
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
    subtitle: 'Kelola nama paket, vendor paket, kategori paket, dan paket awal',
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
      resetKey="paket"
      fields={paketFields}
      emptyMessage="Belum ada data nama, vendor, atau kategori paket."
      items={combinedPaketRows}
      onCreate={async (values) => {
        const packetName = (values.packet_name ?? '').trim();
        const packetVendor = (values.packet_vendor ?? '').trim();
        const packetCategory = (values.packet_category ?? '').trim();

        if (packetName) {
          const created = await createPacketName({ name: packetName });
          if (!created) {
            return;
          }
        }
        if (packetVendor) {
          const created = await createPacketVendor({ name: packetVendor });
          if (!created) {
            return;
          }
        }
        if (packetCategory) {
          await createPacketCategory({ name: packetCategory });
        }
      }}
      onUpdate={async (id, values) => {
        const matched = combinedPaketRows.find((row) => row.id === id);
        if (!matched) {
          return;
        }

        const packetName = (values.packet_name ?? '').trim();
        const packetVendor = (values.packet_vendor ?? '').trim();
        const packetCategory = (values.packet_category ?? '').trim();

        if (packetName) {
          if (matched.packetNameRecord) {
            if (packetName !== matched.packetNameRecord.name) {
              const updated = await updatePacketName(
                matched.packetNameRecord.id,
                { name: packetName }
              );
              if (!updated) {
                return;
              }
            }
          } else {
            const created = await createPacketName({ name: packetName });
            if (!created) {
              return;
            }
          }
        }

        if (packetVendor) {
          if (matched.packetVendorRecord) {
            if (packetVendor !== matched.packetVendorRecord.name) {
              const updated = await updatePacketVendor(
                matched.packetVendorRecord.id,
                { name: packetVendor }
              );
              if (!updated) {
                return;
              }
            }
          } else {
            const created = await createPacketVendor({ name: packetVendor });
            if (!created) {
              return;
            }
          }
        }

        if (packetCategory) {
          if (matched.packetCategoryRecord) {
            if (packetCategory !== matched.packetCategoryRecord.name) {
              await updatePacketCategory(matched.packetCategoryRecord.id, {
                name: packetCategory,
              });
            }
          } else {
            await createPacketCategory({ name: packetCategory });
          }
        }
      }}
      onDelete={async (id) => {
        const matched = combinedPaketRows.find((row) => row.id === id);
        if (!matched) {
          return;
        }

        if (matched.packetNameRecord) {
          const removed = await removePacketName(matched.packetNameRecord.id);
          if (!removed) {
            return;
          }
        }
        if (matched.packetVendorRecord) {
          const removed = await removePacketVendor(
            matched.packetVendorRecord.id
          );
          if (!removed) {
            return;
          }
        }
        if (matched.packetCategoryRecord) {
          await removePacketCategory(matched.packetCategoryRecord.id);
        }
      }}
    />
  );
};
