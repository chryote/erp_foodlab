import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  DefaultPackage,
  PacketVendor,
  PacketVendorPayload,
  PacketVendorType,
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
} from '@/components/ui';
import {
  DEFAULT_CPO_ENUMS,
  useMasterPaketCrudResource,
} from '@/lib/cpoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { cn } from '@/lib/utils';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import { DefaultPackageWizardPanel } from './DefaultPackageWizardPanel';

export type MasterPaketTabKey = 'vendor' | 'default-package';

export const MASTER_PAKET_TABS: Array<{
  key: MasterPaketTabKey;
  label: string;
}> = [
  { key: 'vendor', label: 'Vendor' },
  { key: 'default-package', label: 'Paket Awal' },
];

export interface MasterPaketCrudModalProps {
  isOpen: boolean;
  company?: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const MasterPaketCrudModal: React.FC<MasterPaketCrudModalProps> = ({
  isOpen,
  company = null,
  companies = [],
  onClose,
}) => {
  const activeCompany = useMemo<Company | null>(() => {
    if (company) {
      return company;
    }
    const activeId = getActiveCompanyId();
    if (activeId !== null) {
      return companies.find((c) => c.id === activeId) ?? null;
    }
    return null;
  }, [companies, company]);
  const [activeTab, setActiveTab] = useState<MasterPaketTabKey>('vendor');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDefaultPackage, setEditingDefaultPackage] =
    useState<DefaultPackage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DefaultPackage | null>(
    null
  );

  const pageSize = 10;

  const {
    enums,
    allPacketNames,
    allPacketVendors,
    allPacketCategories,
    allItems,
    allItemPackets,
    allDefaultPackages,
    allIngredients,
    loading,
    error,
    clearError,
    createPacketVendor,
    updatePacketVendor,
    removePacketVendor,
    createDefaultPackageWizard,
    updateDefaultPackageWizard,
    removeDefaultPackage,
  } = useMasterPaketCrudResource(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('vendor');
      setCurrentPage(1);
      setEditingDefaultPackage(null);
      setPendingDelete(null);
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

  const totalPages = Math.max(
    1,
    Math.ceil(allDefaultPackages.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedDefaultPackages = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return allDefaultPackages.slice(start, start + pageSize);
  }, [allDefaultPackages, safeCurrentPage]);

  const defaultPackageColumns: DataTableColumn<DefaultPackage>[] = useMemo(
    () => [
      {
        key: 'no',
        header: 'No',
        render: (_row, index) => (
          <code>{(safeCurrentPage - 1) * pageSize + index + 1}</code>
        ),
      },
      {
        key: 'brand_name',
        header: 'Nama Brand',
        render: (row) => row.brand_name,
      },
      {
        key: 'packet_name_id',
        header: 'Nama Paket',
        render: (row) =>
          allPacketNames.find((p) => p.id === Number(row.packet_name_id))
            ?.name ??
          row.packet_name?.name ??
          String(row.packet_name_id),
      },
      {
        key: 'owner',
        header: 'Vendor Paket',
        render: (row) => {
          if (row.company_id != null) {
            return (
              companies.find((c) => c.id === Number(row.company_id))?.name ??
              row.company?.name ??
              `Perusahaan #${row.company_id}`
            );
          }
          if (row.packet_vendor_id != null) {
            return (
              allPacketVendors.find(
                (v) => v.id === Number(row.packet_vendor_id)
              )?.name ??
              row.packet_vendor?.name ??
              `Vendor #${row.packet_vendor_id}`
            );
          }
          return '-';
        },
      },
      {
        key: 'packet_category_id',
        header: 'Kategori Paket',
        render: (row) =>
          allPacketCategories.find(
            (c) => c.id === Number(row.packet_category_id)
          )?.name ??
          row.packet_category?.name ??
          String(row.packet_category_id),
      },
      {
        key: 'price',
        header: 'Harga (Rp)',
        render: (row) => formatCapitalIdr(Number(row.price ?? 0)),
      },
      {
        key: 'actions',
        header: 'Aksi',
        render: (row) => (
          <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
            <Button
              variant="secondary"
              className="h-7 px-2.5 py-1 text-xs"
              data-testid={`edit-row-${row.id}`}
              onClick={() => {
                clearError();
                setEditingDefaultPackage(row);
              }}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              className="h-7 px-2.5 py-1 text-xs"
              data-testid={`delete-row-${row.id}`}
              onClick={() => setPendingDelete(row)}
            >
              Hapus
            </Button>
          </div>
        ),
      },
    ],
    [
      allPacketCategories,
      allPacketNames,
      allPacketVendors,
      companies,
      safeCurrentPage,
    ]
  );

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
      <>
        <Modal
          isOpen={isOpen}
          title="Master Paket"
          subtitle="Kelola vendor paket dan paket awal"
          testId="master-paket-crud-modal"
          maxWidthClass="max-w-[95vw]"
          dialogClassName="h-[92vh] max-h-[92vh]"
          bodyClassName="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden"
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

          <div
            data-testid="master-paket-crud-modal-split-layout"
            className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]"
          >
            <div
              data-testid="master-paket-crud-modal-form-panel"
              className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/25 p-4 lg:overflow-y-auto"
            >
              <DefaultPackageWizardPanel
                allPacketNames={allPacketNames}
                allPacketCategories={allPacketCategories}
                allPacketVendors={allPacketVendors}
                activeCompany={activeCompany}
                companies={companies}
                allItems={allItems}
                allItemPackets={allItemPackets}
                allIngredients={allIngredients}
                editingPackage={editingDefaultPackage}
                loading={loading}
                onCancelEdit={() => setEditingDefaultPackage(null)}
                onClearExternalError={clearError}
                onSubmitWizard={async (payload, editingId) =>
                  editingId !== undefined
                    ? (await updateDefaultPackageWizard(editingId, payload)) !==
                      null
                    : (await createDefaultPackageWizard(payload)) !== null
                }
              />
            </div>

            <div
              data-testid="master-paket-crud-modal-table-panel"
              className="flex min-h-0 min-w-0 flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
                <DataTable
                  columns={defaultPackageColumns}
                  data={paginatedDefaultPackages}
                  emptyMessage="Belum ada data paket awal."
                  rowKey={(row) => row.id}
                />
              </div>

              <div className="shrink-0 border-t border-border pt-3">
                <Pagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={allDefaultPackages.length}
                  testId="master-paket-crud-modal-pagination"
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={pendingDelete !== null}
          title="Konfirmasi Hapus Data"
          message={`Apakah Anda yakin ingin menghapus paket awal "${pendingDelete?.brand_name ?? ''}"?`}
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          loading={loading}
          onConfirm={async () => {
            if (pendingDelete) {
              const deletedId = pendingDelete.id;
              const ok = await removeDefaultPackage(deletedId);
              if (ok && editingDefaultPackage?.id === deletedId) {
                setEditingDefaultPackage(null);
              }
              setPendingDelete(null);
            }
          }}
          onCancel={() => setPendingDelete(null)}
        />
      </>
    );
  }

  return (
    <CrudModal
      isOpen={isOpen}
      title="Master Paket"
      subtitle="Kelola vendor paket dan paket awal"
      testId="master-paket-crud-modal"
      tabs={tabsBar}
      layout="split"
      labelPlacement="left"
      modalSize="expanded"
      pageSize={pageSize}
      loading={loading}
      error={error}
      onClose={onClose}
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
