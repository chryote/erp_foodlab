import React, { useEffect, useMemo, useState } from 'react';
import type { Company, Item, ItemPacket, Packet } from '@/api/client';
import {
  Badge,
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
  DataTable,
  type DataTableColumn,
  Modal,
  SummaryBanner,
} from '@/components/ui';
import { useMasterPackingCrudResource } from '@/lib/cpoResources';
import {
  type GroupedItemPacketRow,
  formatPackingItemLabel,
  groupItemPacketsByCompanyAndPacket,
} from './packingGrouping';

export interface ViewPackingModalProps {
  isOpen: boolean;
  company?: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const ViewPackingModal: React.FC<ViewPackingModalProps> = ({
  isOpen,
  company = null,
  companies,
  onClose,
}) => {
  const {
    allItems,
    allPackets,
    allItemPackets,
    loading,
    error,
  } = useMasterPackingCrudResource(isOpen, company);

  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedGroupKey(null);
    }
  }, [isOpen]);

  const companiesById = useMemo(() => {
    const map = new Map<number, Company>();
    for (const c of companies ?? []) {
      map.set(Number(c.id), c);
    }
    if (company) {
      map.set(Number(company.id), company);
    }
    return map;
  }, [companies, company]);

  const packetsById = useMemo(() => {
    const map = new Map<number, Packet>();
    for (const packet of allPackets) {
      map.set(Number(packet.id), packet);
    }
    return map;
  }, [allPackets]);

  const itemsById = useMemo(() => {
    const map = new Map<number, Item>();
    for (const item of allItems) {
      map.set(Number(item.id), item);
    }
    return map;
  }, [allItems]);

  const groupedItemPackets = useMemo<GroupedItemPacketRow[]>(
    () =>
      groupItemPacketsByCompanyAndPacket(
        allItemPackets,
        companiesById,
        packetsById
      ),
    [allItemPackets, companiesById, packetsById]
  );

  const selectedGroup = useMemo(
    () =>
      selectedGroupKey === null
        ? null
        : (groupedItemPackets.find(
            (group) => group.group_key === selectedGroupKey
          ) ?? null),
    [groupedItemPackets, selectedGroupKey]
  );

  const grandTotalQuantity = useMemo(
    () =>
      groupedItemPackets.reduce(
        (sum, group) => sum + (Number(group.total_quantity) || 0),
        0
      ),
    [groupedItemPackets]
  );

  const resolveCompanyName = useMemo(
    () => (companyId: number, fallback?: Company | null) =>
      companiesById.get(companyId)?.name ??
      fallback?.name ??
      String(companyId),
    [companiesById]
  );

  const resolvePacketName = useMemo(
    () => (packetId: number, fallback?: Packet | null) =>
      packetsById.get(packetId)?.name ?? fallback?.name ?? String(packetId),
    [packetsById]
  );

  const fields = useMemo<CrudFieldConfig<GroupedItemPacketRow>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Perusahaan',
        renderValue: (row) => resolveCompanyName(row.company_id, row.company),
      },
      {
        key: 'packet_id',
        label: 'Nama Paket',
        renderValue: (row) => resolvePacketName(row.packet_id, row.packet),
      },
    ],
    [resolveCompanyName, resolvePacketName]
  );

  const computedColumns = useMemo<
    CrudComputedColumnConfig<GroupedItemPacketRow>[]
  >(
    () => [
      {
        key: 'items',
        label: 'Item Packing',
        render: (row) =>
          row.item_packets
            .map((ip) => {
              const matched =
                itemsById.get(Number(ip.item_id)) ?? ip.item;
              const label = matched
                ? formatPackingItemLabel(matched)
                : String(ip.item_id);
              return `${label} x${ip.quantity}`;
            })
            .join(', '),
      },
      {
        key: 'item_count',
        label: 'Jumlah Item',
        render: (row) => (
          <Badge variant="neutral">{row.item_packets.length} item</Badge>
        ),
      },
      {
        key: 'total_quantity',
        label: 'Total Qty',
        render: (row) => (
          <Badge variant="neutral">{row.total_quantity} qty</Badge>
        ),
      },
    ],
    [itemsById]
  );

  const detailColumns = useMemo<DataTableColumn<ItemPacket>[]>(
    () => [
      {
        key: 'no',
        header: 'No',
        render: (_row, index) => <code>{index + 1}</code>,
      },
      {
        key: 'code',
        header: 'Kode Item',
        render: (row) => {
          const matched = itemsById.get(Number(row.item_id)) ?? row.item;
          return matched?.code || '-';
        },
      },
      {
        key: 'name',
        header: 'Nama Item',
        render: (row) => {
          const matched = itemsById.get(Number(row.item_id)) ?? row.item;
          return matched?.name ?? String(row.item_id);
        },
      },
      {
        key: 'type',
        header: 'Tipe',
        render: (row) => {
          const matched = itemsById.get(Number(row.item_id)) ?? row.item;
          return matched?.type ?? '-';
        },
      },
      {
        key: 'quantity',
        header: 'Jumlah',
        render: (row) => (
          <Badge variant="neutral">{row.quantity} qty</Badge>
        ),
      },
    ],
    [itemsById]
  );

  const selectedCompanyName = selectedGroup
    ? resolveCompanyName(selectedGroup.company_id, selectedGroup.company)
    : '';
  const selectedPacketName = selectedGroup
    ? resolvePacketName(selectedGroup.packet_id, selectedGroup.packet)
    : '';

  return (
    <>
      <CrudModal
        isOpen={isOpen}
        title="View Packing"
        subtitle="Daftar item packing dikelompokkan berdasarkan Perusahaan dan Paket"
        testId="view-packing-modal"
        layout="split"
        modalSize="expanded"
        fields={fields}
        computedColumns={computedColumns}
        rowActions={[
          {
            key: 'detail',
            label: 'Detail',
            variant: 'secondary',
            testId: (row) => `detail-packing-row-${row.id}`,
            onClick: (row) => setSelectedGroupKey(row.group_key),
          },
        ]}
        summary={
          <SummaryBanner
            label={`Total Grup Packing (${groupedItemPackets.length} Paket)`}
            value={`${allItemPackets.length} Item (${grandTotalQuantity} Qty)`}
            testId="view-packing-total-banner"
          />
        }
        emptyMessage="Belum ada data packing."
        pageSize={10}
        items={groupedItemPackets}
        loading={loading}
        error={error}
        readOnly={true}
        onClose={onClose}
      />

      <Modal
        isOpen={isOpen && selectedGroup !== null}
        title={selectedPacketName || 'Detail Packing'}
        subtitle={
          selectedCompanyName
            ? `${selectedCompanyName} • Rincian komposisi item packing`
            : 'Rincian komposisi item packing'
        }
        testId="view-packing-detail-modal"
        maxWidthClass="max-w-4xl"
        onClose={() => setSelectedGroupKey(null)}
      >
        {selectedGroup && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/25 p-4 sm:grid-cols-2">
              {[
                ['Perusahaan', selectedCompanyName],
                ['Nama Paket', selectedPacketName],
                ['Jumlah Jenis Item', `${selectedGroup.item_packets.length} item`],
                ['Total Qty', `${selectedGroup.total_quantity} qty`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="font-medium text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-right font-semibold text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <SummaryBanner
              label={`Total Item Packing (${selectedGroup.item_packets.length} item)`}
              value={`${selectedGroup.total_quantity} Qty`}
              testId="view-packing-detail-total-banner"
            />

            <DataTable
              columns={detailColumns}
              data={selectedGroup.item_packets}
              rowKey={(row) => row.id}
              emptyMessage="Belum ada item packing."
            />
          </div>
        )}
      </Modal>
    </>
  );
};
