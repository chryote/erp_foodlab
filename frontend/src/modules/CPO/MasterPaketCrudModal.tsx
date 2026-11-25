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
import {
  Button,
  ConfirmDialog,
  type CrudFieldConfig,
  CrudModal,
  DataTable,
  type DataTableColumn,
  Modal,
  Pagination,
  TextInput,
} from '@/components/ui';
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

type PaketEntityKey = 'packet-name' | 'packet-vendor' | 'packet-category';

interface NamedEntity {
  id: number;
  name: string;
}

type PendingPaketAction =
  | { entity: PaketEntityKey; type: 'create'; name: string }
  | { entity: PaketEntityKey; type: 'update'; id: number; name: string }
  | { entity: PaketEntityKey; type: 'delete'; id: number };

interface SplitNameCrudSectionProps<T extends NamedEntity> {
  sectionKey: PaketEntityKey;
  sectionTitle: string;
  inputLabel: string;
  inputPlaceholder: string;
  emptyMessage: string;
  items: T[];
  loading: boolean;
  pageSize?: number;
  resetSignal: number;
  onRequestAction: (action: PendingPaketAction) => void;
}

function SplitNameCrudSection<T extends NamedEntity>({
  sectionKey,
  sectionTitle,
  inputLabel,
  inputPlaceholder,
  emptyMessage,
  items,
  loading,
  pageSize = 5,
  resetSignal,
  onRequestAction,
}: SplitNameCrudSectionProps<T>) {
  const [nameValue, setNameValue] = useState('');
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setNameValue('');
    setEditingItem(null);
    setCurrentPage(1);
  }, [resetSignal]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safeCurrentPage, pageSize]);

  const handleStartEdit = (row: T) => {
    setEditingItem(row);
    setNameValue(row.name ?? '');
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setNameValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameValue.trim();
    if (!trimmed) {
      return;
    }
    if (editingItem) {
      onRequestAction({
        entity: sectionKey,
        type: 'update',
        id: editingItem.id,
        name: trimmed,
      });
    } else {
      onRequestAction({
        entity: sectionKey,
        type: 'create',
        name: trimmed,
      });
    }
  };

  const columns: DataTableColumn<T>[] = [
    {
      key: 'no',
      header: 'No',
      render: (_row, index) => (
        <code>{(safeCurrentPage - 1) * pageSize + index + 1}</code>
      ),
    },
    {
      key: 'name',
      header: inputLabel,
      render: (row) => row.name,
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div
          className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap"
          data-testid={`actions-row-${row.id}`}
        >
          <Button
            variant="secondary"
            className="h-7 px-2.5 py-1 text-xs"
            data-testid={`edit-row-${row.id}`}
            onClick={() => handleStartEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="h-7 px-2.5 py-1 text-xs"
            data-testid={`delete-row-${row.id}`}
            onClick={() =>
              onRequestAction({
                entity: sectionKey,
                type: 'delete',
                id: row.id,
              })
            }
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section
      data-testid={`master-paket-section-${sectionKey}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-4"
    >
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-bold tracking-tight text-foreground">
          {sectionTitle}
        </h3>
        <span className="text-xs text-muted-foreground">
          {items.length} data
        </span>
      </div>

      <div
        data-testid={`master-paket-${sectionKey}-split-layout`}
        className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[460px_minmax(0,1fr)]"
      >
        <div
          data-testid={`master-paket-${sectionKey}-form-panel`}
          className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/25 p-4"
        >
          <form
            onSubmit={handleSubmit}
            data-testid={`master-paket-${sectionKey}-form`}
            className="flex flex-col gap-4"
          >
            <div className="border-b border-border pb-2.5">
              <h4 className="text-sm font-semibold text-foreground">
                {editingItem ? 'Edit Data' : 'Tambah Data'}
              </h4>
              <p className="text-xs text-muted-foreground">
                {editingItem
                  ? 'Perbarui data yang dipilih lalu simpan perubahan.'
                  : 'Lengkapi formulir di bawah ini untuk menambahkan data baru.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <TextInput
                id={`master-paket-${sectionKey}-name-input`}
                label={inputLabel}
                labelPlacement="left"
                placeholder={inputPlaceholder}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button type="submit" variant="primary" disabled={loading}>
                {editingItem ? 'Perbarui' : 'Tambah'}
              </Button>
              {editingItem && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelEdit}
                >
                  Batal
                </Button>
              )}
            </div>
          </form>
        </div>

        <div
          data-testid={`master-paket-${sectionKey}-table-panel`}
          className="flex min-h-0 min-w-0 flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4"
        >
          <DataTable
            columns={columns}
            data={paginatedItems}
            rowKey={(row) => row.id}
            emptyMessage={emptyMessage}
          />
          <div className="shrink-0 border-t border-border pt-3">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={items.length}
              testId={`master-paket-${sectionKey}-pagination`}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </section>
  );
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
  const [pendingAction, setPendingAction] =
    useState<PendingPaketAction | null>(null);
  const [resetSignals, setResetSignals] = useState<
    Record<PaketEntityKey, number>
  >({
    'packet-name': 0,
    'packet-vendor': 0,
    'packet-category': 0,
  });

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
      setPendingAction(null);
      setResetSignals((prev) => ({
        'packet-name': prev['packet-name'] + 1,
        'packet-vendor': prev['packet-vendor'] + 1,
        'packet-category': prev['packet-category'] + 1,
      }));
      clearError();
    }
  }, [isOpen, clearError]);

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

  const bumpResetSignal = (entity: PaketEntityKey) => {
    setResetSignals((prev) => ({ ...prev, [entity]: prev[entity] + 1 }));
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction) {
      return;
    }
    const action = pendingAction;
    setPendingAction(null);

    const handlers: Record<
      PaketEntityKey,
      {
        create: (payload: { name: string }) => Promise<NamedEntity | null>;
        update: (
          id: number,
          payload: { name: string }
        ) => Promise<NamedEntity | null>;
        remove: (id: number) => Promise<boolean>;
      }
    > = {
      'packet-name': {
        create: createPacketName,
        update: updatePacketName,
        remove: removePacketName,
      },
      'packet-vendor': {
        create: createPacketVendor,
        update: updatePacketVendor,
        remove: removePacketVendor,
      },
      'packet-category': {
        create: createPacketCategory,
        update: updatePacketCategory,
        remove: removePacketCategory,
      },
    };

    const handler = handlers[action.entity];
    if (action.type === 'create') {
      const created = await handler.create({ name: action.name });
      if (created) {
        bumpResetSignal(action.entity);
      }
    } else if (action.type === 'update') {
      const updated = await handler.update(action.id, { name: action.name });
      if (updated) {
        bumpResetSignal(action.entity);
      }
    } else {
      const removed = await handler.remove(action.id);
      if (removed) {
        bumpResetSignal(action.entity);
      }
    }
  };

  const confirmDialogConfig = useMemo(() => {
    if (!pendingAction) {
      return { title: '', message: '' };
    }
    if (pendingAction.type === 'create') {
      return {
        title: 'Konfirmasi Tambah Data',
        message: 'Apakah Anda yakin ingin menambahkan data ini?',
      };
    }
    if (pendingAction.type === 'update') {
      return {
        title: 'Konfirmasi Perbarui Data',
        message: 'Apakah Anda yakin ingin memperbarui data ini?',
      };
    }
    return {
      title: 'Konfirmasi Hapus Data',
      message: 'Apakah Anda yakin ingin menghapus data ini?',
    };
  }, [pendingAction]);

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

  if (activeTab === 'default-package') {
    return (
      <CrudModal
        isOpen={isOpen}
        title="Master Paket"
        subtitle="Kelola nama paket, vendor paket, kategori paket, dan paket awal"
        testId="master-paket-crud-modal"
        tabs={tabsBar}
        resetKey="default-package"
        layout="split"
        labelPlacement="left"
        modalSize="expanded"
        pageSize={10}
        fields={defaultPackageFields}
        emptyMessage="Belum ada data paket awal."
        items={allDefaultPackages}
        loading={loading}
        error={error}
        onClose={onClose}
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
    <>
      <Modal
        isOpen={isOpen}
        title="Master Paket"
        subtitle="Kelola nama paket, vendor paket, kategori paket, dan paket awal"
        testId="master-paket-crud-modal"
        maxWidthClass="max-w-[95vw]"
        dialogClassName="h-[92vh] max-h-[92vh]"
        bodyClassName="flex-1 min-h-0 overflow-hidden"
        onClose={onClose}
      >
        {tabsBar}

        {error && (
          <div
            role="alert"
            className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm text-primary"
          >
            {error}
          </div>
        )}

        {activeTab === 'paket' && (
          <div
            data-testid="master-paket-tab-panel-paket"
            className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1"
          >
            <SplitNameCrudSection<PacketName>
              sectionKey="packet-name"
              sectionTitle="Nama Paket"
              inputLabel="Nama Paket"
              inputPlaceholder="Contoh: Paket Hemat"
              emptyMessage="Belum ada data nama paket."
              items={allPacketNames}
              loading={loading}
              resetSignal={resetSignals['packet-name']}
              onRequestAction={setPendingAction}
            />

            <SplitNameCrudSection<PacketVendor>
              sectionKey="packet-vendor"
              sectionTitle="Vendor Paket"
              inputLabel="Nama Vendor Paket"
              inputPlaceholder="Contoh: Vendor Utama"
              emptyMessage="Belum ada data vendor paket."
              items={allPacketVendors}
              loading={loading}
              resetSignal={resetSignals['packet-vendor']}
              onRequestAction={setPendingAction}
            />

            <SplitNameCrudSection<PacketCategory>
              sectionKey="packet-category"
              sectionTitle="Kategori Paket"
              inputLabel="Nama Kategori Paket"
              inputPlaceholder="Contoh: Kategori Reguler"
              emptyMessage="Belum ada data kategori paket."
              items={allPacketCategories}
              loading={loading}
              resetSignal={resetSignals['packet-category']}
              onRequestAction={setPendingAction}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isOpen && pendingAction !== null}
        title={confirmDialogConfig.title}
        message={confirmDialogConfig.message}
        loading={loading}
        onConfirm={handleConfirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
};
