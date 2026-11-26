import React, { useEffect, useMemo, useState } from 'react';
import type { DefaultPackage, Ingredient, Item } from '@/api/client';
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
import { useIngredientCrudResource } from '@/lib/cpoResources';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  type GroupedIngredientRow,
  formatDefaultPackageLabel,
  formatItemLabel,
  groupIngredientsByPackage,
} from './ingredientGrouping';

export interface ViewBahanBakuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ViewBahanBakuModal: React.FC<ViewBahanBakuModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    allIngredients,
    allDefaultPackages,
    allItems,
    loading,
    error,
  } = useIngredientCrudResource(isOpen);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedGroupId(null);
    }
  }, [isOpen]);

  const defaultPackagesById = useMemo(() => {
    const map = new Map<number, DefaultPackage>();
    for (const dp of allDefaultPackages) {
      map.set(Number(dp.id), dp);
    }
    return map;
  }, [allDefaultPackages]);

  const itemsById = useMemo(() => {
    const map = new Map<number, Item>();
    for (const item of allItems) {
      map.set(Number(item.id), item);
    }
    return map;
  }, [allItems]);

  const groupedIngredients = useMemo<GroupedIngredientRow[]>(
    () => groupIngredientsByPackage(allIngredients, defaultPackagesById),
    [allIngredients, defaultPackagesById]
  );

  const selectedGroup = useMemo(
    () =>
      selectedGroupId === null
        ? null
        : (groupedIngredients.find(
            (group) => group.default_package_id === selectedGroupId
          ) ?? null),
    [groupedIngredients, selectedGroupId]
  );

  const selectedDefaultPackage = selectedGroup
    ? (defaultPackagesById.get(selectedGroup.default_package_id) ??
      selectedGroup.default_package ??
      null)
    : null;

  const grandTotalPrice = useMemo(
    () =>
      groupedIngredients.reduce(
        (sum, group) => sum + (Number(group.total_price) || 0),
        0
      ),
    [groupedIngredients]
  );

  const fields = useMemo<CrudFieldConfig<GroupedIngredientRow>[]>(
    () => [
      {
        key: 'default_package_id',
        label: 'Nama Brand',
        renderValue: (row) => {
          const matched =
            defaultPackagesById.get(row.default_package_id) ??
            row.default_package;
          return matched
            ? formatDefaultPackageLabel(matched)
            : String(row.default_package_id);
        },
      },
    ],
    [defaultPackagesById]
  );

  const computedColumns = useMemo<
    CrudComputedColumnConfig<GroupedIngredientRow>[]
  >(
    () => [
      {
        key: 'ingredients',
        label: 'Bahan Baku',
        render: (row) =>
          row.ingredients
            .map((ing) => {
              const matched =
                itemsById.get(Number(ing.item_id)) ?? ing.item;
              return matched ? formatItemLabel(matched) : String(ing.item_id);
            })
            .join(', '),
      },
      {
        key: 'item_count',
        label: 'Jumlah Item',
        render: (row) => (
          <Badge variant="neutral">{row.ingredients.length} item</Badge>
        ),
      },
      {
        key: 'total_price',
        label: 'Harga (Rp)',
        render: (row) => formatCapitalIdr(row.total_price),
      },
    ],
    [itemsById]
  );

  const detailColumns = useMemo<DataTableColumn<Ingredient>[]>(
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
        header: 'Bahan Baku',
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
        key: 'price',
        header: 'Harga (Rp)',
        render: (row) => formatCapitalIdr(Number(row.price ?? 0)),
      },
    ],
    [itemsById]
  );

  const detailSubtitle = selectedDefaultPackage
    ? [
        selectedDefaultPackage.packet_name?.name,
        selectedDefaultPackage.packet_vendor?.name,
        selectedDefaultPackage.packet_category?.name,
      ]
        .filter(Boolean)
        .join(' • ') || 'Rincian komposisi bahan baku paket'
    : undefined;

  return (
    <>
      <CrudModal
        isOpen={isOpen}
        title="View Bahan Baku"
        subtitle="Daftar bahan baku (Ingredient) dikelompokkan berdasarkan Nama Brand"
        testId="view-bahan-baku-modal"
        layout="split"
        modalSize="expanded"
        fields={fields}
        computedColumns={computedColumns}
        rowActions={[
          {
            key: 'detail',
            label: 'Detail',
            variant: 'secondary',
            testId: (row) => `detail-bahan-baku-row-${row.id}`,
            onClick: (row) => setSelectedGroupId(row.default_package_id),
          },
        ]}
        summary={
          <SummaryBanner
            label={`Total Nilai Bahan Baku (${groupedIngredients.length} Brand)`}
            value={formatCapitalIdr(grandTotalPrice)}
            testId="view-bahan-baku-total-banner"
          />
        }
        emptyMessage="Belum ada data bahan baku."
        pageSize={10}
        items={groupedIngredients}
        loading={loading}
        error={error}
        readOnly={true}
        onClose={onClose}
      />

      <Modal
        isOpen={isOpen && selectedGroup !== null}
        title={selectedDefaultPackage?.brand_name ?? 'Detail Bahan Baku'}
        subtitle={detailSubtitle}
        testId="view-bahan-baku-detail-modal"
        maxWidthClass="max-w-4xl"
        onClose={() => setSelectedGroupId(null)}
      >
        {selectedGroup && (
          <div className="flex flex-col gap-4 text-sm">
            {selectedDefaultPackage && (
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/25 p-4 sm:grid-cols-2">
                {[
                  ['Nama Brand', selectedDefaultPackage.brand_name],
                  [
                    'Nama Paket',
                    selectedDefaultPackage.packet_name?.name ?? '-',
                  ],
                  [
                    'Vendor Paket',
                    selectedDefaultPackage.packet_vendor?.name ?? '-',
                  ],
                  [
                    'Kategori Paket',
                    selectedDefaultPackage.packet_category?.name ?? '-',
                  ],
                  [
                    'Harga Paket Awal',
                    formatCapitalIdr(Number(selectedDefaultPackage.price ?? 0)),
                  ],
                  [
                    'Jumlah Bahan Baku',
                    `${selectedGroup.ingredients.length} item`,
                  ],
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
            )}

            <SummaryBanner
              label={`Total Harga Bahan Baku (${selectedGroup.ingredients.length} item)`}
              value={formatCapitalIdr(selectedGroup.total_price)}
              testId="view-bahan-baku-detail-total-banner"
            />

            <DataTable
              columns={detailColumns}
              data={selectedGroup.ingredients}
              rowKey={(row) => row.id}
              emptyMessage="Belum ada item bahan baku."
            />
          </div>
        )}
      </Modal>
    </>
  );
};
