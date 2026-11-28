import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Company,
  DefaultPackage,
  Ingredient,
  Item,
} from '@/api/client';
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

export interface ViewPaketAwalModalProps {
  isOpen: boolean;
  pageMode?: boolean;
  companies?: Company[];
  onClose: () => void;
}

interface DefaultPackageDetailItemRow {
  id: string;
  code: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
}

export const ViewPaketAwalModal: React.FC<ViewPaketAwalModalProps> = ({
  isOpen,
  pageMode = false,
  companies = [],
  onClose,
}) => {
  const {
    allIngredients,
    allDefaultPackages,
    allItemPackets,
    allItems,
    pageQuery,
    loading,
    error,
  } = useIngredientCrudResource(isOpen, pageMode);

  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedPackageId(null);
    }
  }, [isOpen]);

  const itemsById = useMemo(() => {
    const map = new Map<number, Item>();
    for (const item of allItems) {
      map.set(Number(item.id), item);
    }
    return map;
  }, [allItems]);

  const companiesById = useMemo(() => {
    const map = new Map<number, Company>();
    for (const company of companies) {
      map.set(Number(company.id), company);
    }
    return map;
  }, [companies]);

  const ingredientsByPackageId = useMemo(() => {
    const map = new Map<number, Ingredient[]>();
    for (const ing of allIngredients) {
      const dpId = Number(ing.default_package_id);
      const list = map.get(dpId);
      if (list) {
        list.push(ing);
      } else {
        map.set(dpId, [ing]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.id - b.id);
    }
    return map;
  }, [allIngredients]);

  const resolveOwnerName = useCallback(
    (dp: DefaultPackage): string => {
      if (dp.company_id != null) {
        return (
          dp.company?.name ??
          companiesById.get(Number(dp.company_id))?.name ??
          `Perusahaan #${dp.company_id}`
        );
      }
      if (dp.packet_vendor_id != null) {
        return dp.packet_vendor?.name ?? `Vendor #${dp.packet_vendor_id}`;
      }
      return '-';
    },
    [companiesById]
  );

  const resolveDetailItems = useCallback(
    (dp: DefaultPackage): DefaultPackageDetailItemRow[] => {
      const packageIngredients =
        ingredientsByPackageId.get(Number(dp.id)) ?? [];
      const targetPacketId =
        dp.packet_id ?? dp.item_packet?.packet_id ?? null;

      if (packageIngredients.length > 0) {
        return packageIngredients.map((ing) => {
          const item = itemsById.get(Number(ing.item_id)) ?? ing.item;
          const matchedIp = allItemPackets.find((ip) => {
            if (Number(ip.item_id) !== Number(ing.item_id)) {
              return false;
            }
            if (
              targetPacketId !== null &&
              Number(ip.packet_id) !== Number(targetPacketId)
            ) {
              return false;
            }
            if (dp.company_id != null) {
              return Number(ip.company_id) === Number(dp.company_id);
            }
            if (dp.packet_vendor_id != null) {
              return (
                Number(ip.packet_vendor_id) === Number(dp.packet_vendor_id)
              );
            }
            return true;
          });

          const quantity = Number(
            matchedIp?.quantity ??
              (dp.item_packet &&
              Number(dp.item_packet.item_id) === Number(ing.item_id)
                ? dp.item_packet.quantity
                : 1) ??
              1
          );

          return {
            id: `ing-${ing.id}`,
            code: item?.code || '-',
            name: item?.name ?? `Item #${ing.item_id}`,
            type: item?.type ?? '-',
            quantity,
            price: Number(ing.price ?? 0),
          };
        });
      }

      if (dp.item_packet) {
        const item =
          itemsById.get(Number(dp.item_packet.item_id)) ?? dp.item_packet.item;
        return [
          {
            id: `ip-${dp.item_packet.id}`,
            code: item?.code || '-',
            name: item?.name ?? `Item #${dp.item_packet.item_id}`,
            type: item?.type ?? '-',
            quantity: Number(dp.item_packet.quantity ?? 1),
            price: Number(dp.price ?? 0),
          },
        ];
      }

      return [];
    },
    [allItemPackets, ingredientsByPackageId, itemsById]
  );

  const selectedPackage = useMemo(
    () =>
      selectedPackageId === null
        ? null
        : (allDefaultPackages.find(
            (dp) => Number(dp.id) === Number(selectedPackageId)
          ) ?? null),
    [allDefaultPackages, selectedPackageId]
  );

  const selectedDetailItems = useMemo(
    () => (selectedPackage ? resolveDetailItems(selectedPackage) : []),
    [resolveDetailItems, selectedPackage]
  );

  const grandTotalPrice = useMemo(
    () =>
      allDefaultPackages.reduce(
        (sum, dp) => sum + (Number(dp.price) || 0),
        0
      ),
    [allDefaultPackages]
  );

  const fields = useMemo<CrudFieldConfig<DefaultPackage>[]>(
    () => [
      {
        key: 'brand_name',
        label: 'Nama Brand',
      },
    ],
    []
  );

  const computedColumns = useMemo<CrudComputedColumnConfig<DefaultPackage>[]>(
    () => [
      {
        key: 'packet_name_id',
        label: 'Nama Paket',
        render: (row) =>
          row.packet_name?.name ?? String(row.packet_name_id),
      },
      {
        key: 'packet_category_id',
        label: 'Kategori Paket',
        render: (row) =>
          row.packet_category?.name ?? String(row.packet_category_id),
      },
      {
        key: 'owner',
        label: 'Pemilik',
        render: (row) => resolveOwnerName(row),
      },
      {
        key: 'item_count',
        label: 'Jumlah Item',
        render: (row) => {
          const itemCount = resolveDetailItems(row).length;
          return <Badge variant="neutral">{itemCount} item</Badge>;
        },
      },
      {
        key: 'price',
        label: 'Harga Paket Awal',
        render: (row) => formatCapitalIdr(Number(row.price ?? 0)),
      },
    ],
    [resolveDetailItems, resolveOwnerName]
  );

  const detailColumns = useMemo<DataTableColumn<DefaultPackageDetailItemRow>[]>(
    () => [
      {
        key: 'no',
        header: 'No',
        render: (_row, index) => <code>{index + 1}</code>,
      },
      {
        key: 'code',
        header: 'Kode Item',
        render: (row) => row.code,
      },
      {
        key: 'name',
        header: 'Nama Item',
        render: (row) => row.name,
      },
      {
        key: 'type',
        header: 'Tipe',
        render: (row) => row.type,
      },
      {
        key: 'quantity',
        header: 'Qty',
        render: (row) => row.quantity,
      },
    ],
    []
  );

  const detailSubtitle = selectedPackage
    ? [
        selectedPackage.packet_name?.name,
        resolveOwnerName(selectedPackage),
        selectedPackage.packet_category?.name,
      ]
        .filter((part) => part && part !== '-')
        .join(' • ') || 'Rincian komposisi paket awal'
    : undefined;

  return (
    <>
      <CrudModal
        isOpen={isOpen}
        pageMode={pageMode}
        title="View Paket Awal"
        subtitle="Daftar paket awal beserta komposisi item dan total harga"
        testId="view-paket-awal-modal"
        layout="split"
        modalSize="expanded"
        fields={fields}
        computedColumns={computedColumns}
        rowActions={[
          {
            key: 'detail',
            label: 'Detail',
            variant: 'secondary',
            testId: (row) => `detail-paket-awal-row-${row.id}`,
            onClick: (row) => setSelectedPackageId(row.id),
          },
        ]}
        summary={
          <SummaryBanner
            label={
              pageMode
                ? `Nilai Paket Awal Dimuat (${allDefaultPackages.length} Paket)`
                : `Total Nilai Paket Awal (${allDefaultPackages.length} Paket)`
            }
            value={formatCapitalIdr(grandTotalPrice)}
            testId="view-paket-awal-total-banner"
          />
        }
        emptyMessage="Belum ada data paket awal."
        pageSize={10}
        items={allDefaultPackages}
        displayItems={pageMode ? allDefaultPackages : undefined}
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
            ? 'Gagal memuat paket berikutnya.'
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
        readOnly={true}
        onClose={onClose}
      />

      <Modal
        isOpen={isOpen && selectedPackage !== null}
        title={selectedPackage?.brand_name ?? 'Detail Paket Awal'}
        subtitle={detailSubtitle}
        testId="view-paket-awal-detail-modal"
        maxWidthClass="max-w-4xl"
        onClose={() => setSelectedPackageId(null)}
      >
        {selectedPackage && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/25 p-4 sm:grid-cols-2">
              {[
                ['Nama Brand', selectedPackage.brand_name],
                [
                  'Nama Paket',
                  selectedPackage.packet_name?.name ??
                    String(selectedPackage.packet_name_id),
                ],
                [
                  'Kategori Paket',
                  selectedPackage.packet_category?.name ??
                    String(selectedPackage.packet_category_id),
                ],
                ['Pemilik', resolveOwnerName(selectedPackage)],
                [
                  'Paket',
                  selectedPackage.packet?.name ??
                    selectedPackage.item_packet?.packet?.name ??
                    '-',
                ],
                ['Jumlah Item', `${selectedDetailItems.length} item`],
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
              label={`Total Harga Paket Awal (${selectedDetailItems.length} item)`}
              value={formatCapitalIdr(Number(selectedPackage.price ?? 0))}
              testId="view-paket-awal-detail-total-banner"
            />

            <DataTable
              columns={detailColumns}
              data={selectedDetailItems}
              rowKey={(row) => row.id}
              emptyMessage="Belum ada rincian item pada paket awal ini."
            />
          </div>
        )}
      </Modal>
    </>
  );
};
