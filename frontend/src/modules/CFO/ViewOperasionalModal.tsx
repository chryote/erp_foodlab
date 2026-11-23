import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  ExpenseCategory,
  ExpenseItem,
  ExpenseType,
} from '@/api/client';
import {
  type CrudFieldConfig,
  CrudModal,
  Modal,
  SummaryBanner,
} from '@/components/ui';
import { useMasterOperasionalCrudResource } from '@/lib/cfoResources';
import { formatCapitalIdr } from './CapitalCompanyCrudModal';

export function formatOperasionalNumber(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '0';
  }
  const divided = amount / 1_000_000;
  return String(Number(divided.toFixed(6)));
}

export function formatCurrentMonthDateRange(
  referenceDate: Date = new Date()
): string {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function isInMonth(
  dateValue: string | null | undefined,
  referenceDate: Date
): boolean {
  if (!dateValue) {
    return true;
  }
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue.trim());
  if (ymdMatch && !dateValue.includes('T')) {
    return (
      Number(ymdMatch[1]) === referenceDate.getFullYear() &&
      Number(ymdMatch[2]) - 1 === referenceDate.getMonth()
    );
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }
  return (
    parsed.getFullYear() === referenceDate.getFullYear() &&
    parsed.getMonth() === referenceDate.getMonth()
  );
}

function resolveItemCategoryId(
  item: ExpenseItem,
  typeLookup: Map<number, ExpenseType>
): number {
  const matchedType = typeLookup.get(Number(item.expense_type_id));
  return Number(
    item.expense_category_id ||
      matchedType?.expense_category_id ||
      item.expense_type?.expense_category_id
  );
}

type SelectedOperasionalDetail =
  | { kind: 'category'; category: ExpenseCategory }
  | { kind: 'type'; type: ExpenseType; categoryName: string };

export interface ViewOperasionalModalProps {
  isOpen: boolean;
  company: Company | null;
  referenceDate?: Date;
  onClose: () => void;
}

export const ViewOperasionalModal: React.FC<ViewOperasionalModalProps> = ({
  isOpen,
  company,
  referenceDate,
  onClose,
}) => {
  const { categories, types, items, loading, error } =
    useMasterOperasionalCrudResource(isOpen, company);

  const [selectedDetail, setSelectedDetail] =
    useState<SelectedOperasionalDetail | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDetail(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedDetail(null);
  }, [company?.id]);

  const effectiveDate = useMemo(
    () => referenceDate ?? new Date(),
    [referenceDate]
  );

  const dateRangeLabel = useMemo(
    () => formatCurrentMonthDateRange(effectiveDate),
    [effectiveDate]
  );

  const currentMonthItems = useMemo(
    () =>
      items.filter((item) =>
        isInMonth(item.purchased_on || item.created_at, effectiveDate)
      ),
    [items, effectiveDate]
  );

  const {
    amountByCategoryId,
    amountByTypeId,
    typesByCategoryId,
    typeLookup,
  } = useMemo(() => {
    const catTotals = new Map<number, number>();
    const typeTotals = new Map<number, number>();
    const typeMap = new Map<number, ExpenseType>();
    const groupedTypes = new Map<number, ExpenseType[]>();

    for (const type of types) {
      typeMap.set(type.id, type);
      const catId = Number(type.expense_category_id);
      const existing = groupedTypes.get(catId);
      if (existing) {
        existing.push(type);
      } else {
        groupedTypes.set(catId, [type]);
      }
    }

    for (const item of currentMonthItems) {
      const amount = Number(item.amount) || 0;
      const typeId = Number(item.expense_type_id);
      const categoryId = resolveItemCategoryId(item, typeMap);

      if (Number.isFinite(categoryId) && categoryId > 0) {
        catTotals.set(categoryId, (catTotals.get(categoryId) ?? 0) + amount);
      }
      if (Number.isFinite(typeId) && typeId > 0) {
        typeTotals.set(typeId, (typeTotals.get(typeId) ?? 0) + amount);
      }
    }

    return {
      amountByCategoryId: catTotals,
      amountByTypeId: typeTotals,
      typesByCategoryId: groupedTypes,
      typeLookup: typeMap,
    };
  }, [currentMonthItems, types]);

  const detailItems = useMemo(() => {
    if (!selectedDetail) {
      return [];
    }
    if (selectedDetail.kind === 'category') {
      return currentMonthItems.filter(
        (item) =>
          resolveItemCategoryId(item, typeLookup) === selectedDetail.category.id
      );
    }
    return currentMonthItems.filter(
      (item) => Number(item.expense_type_id) === selectedDetail.type.id
    );
  }, [selectedDetail, currentMonthItems, typeLookup]);

  const detailTotal = useMemo(
    () =>
      detailItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [detailItems]
  );

  const detailFields = useMemo<CrudFieldConfig<ExpenseItem>[]>(
    () => [
      {
        key: 'purchased_on',
        label: 'Tanggal Transaksi',
        renderValue: (row) => row.purchased_on ?? '-',
      },
      {
        key: 'expense_type_id',
        label: 'Tipe',
        renderValue: (row) =>
          typeLookup.get(Number(row.expense_type_id))?.name ??
          row.expense_type?.name ??
          String(row.expense_type_id),
      },
      {
        key: 'name',
        label: 'Nama Item',
      },
      {
        key: 'detail',
        label: 'Keterangan',
        renderValue: (row) => (row.detail ? row.detail : '-'),
      },
      {
        key: 'amount',
        label: 'Nominal',
        renderValue: (row) => formatCapitalIdr(Number(row.amount)),
      },
    ],
    [typeLookup]
  );

  const detailSubtitle = selectedDetail
    ? selectedDetail.kind === 'category'
      ? `Kategori: ${selectedDetail.category.name} (${dateRangeLabel})`
      : `Kategori: ${selectedDetail.categoryName} • Tipe: ${selectedDetail.type.name} (${dateRangeLabel})`
    : undefined;

  const detailLabel = selectedDetail
    ? selectedDetail.kind === 'category'
      ? selectedDetail.category.name
      : selectedDetail.type.name
    : '';

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="View Operasional"
        subtitle={
          company
            ? `Ringkasan biaya operasional untuk ${company.name}`
            : 'Ringkasan biaya operasional'
        }
        testId="view-operasional-modal"
        onClose={onClose}
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm text-primary"
          >
            {error}
          </div>
        )}

        <div
          className="overflow-hidden rounded-xl border border-border bg-card"
          data-testid="view-operasional-sheet"
        >
          <div
            className="border-b border-border px-5 py-3.5 text-center text-sm font-semibold tracking-tight text-foreground"
            data-testid="view-operasional-date-range"
          >
            {dateRangeLabel}
          </div>

          <div className="px-5 py-4">
            {loading && categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Memuat data operasional...
              </p>
            ) : categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada data operasional.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {categories.map((category) => {
                  const categoryTotal =
                    amountByCategoryId.get(category.id) ?? 0;
                  const categoryTypes =
                    typesByCategoryId.get(category.id) ?? [];

                  return (
                    <div
                      key={category.id}
                      data-testid={`view-operasional-category-${category.id}`}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-sm font-semibold text-foreground">
                          {category.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDetail({ kind: 'category', category })
                          }
                          data-testid={`view-operasional-category-amount-${category.id}`}
                          className="cursor-pointer rounded px-1.5 py-0.5 text-right text-sm font-semibold tabular-nums text-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:underline"
                        >
                          {formatOperasionalNumber(categoryTotal)}
                        </button>
                      </div>

                      {categoryTypes.length > 0 && (
                        <div className="flex flex-col gap-1.5 pl-4">
                          {categoryTypes.map((type) => {
                            const typeTotal =
                              amountByTypeId.get(type.id) ?? 0;
                            return (
                              <div
                                key={type.id}
                                data-testid={`view-operasional-type-${type.id}`}
                                className="flex items-baseline justify-between gap-4"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {type.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedDetail({
                                      kind: 'type',
                                      type,
                                      categoryName: category.name,
                                    })
                                  }
                                  data-testid={`view-operasional-type-amount-${type.id}`}
                                  className="cursor-pointer rounded px-1.5 py-0.5 text-right text-sm tabular-nums text-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:underline"
                                >
                                  {formatOperasionalNumber(typeTotal)}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <CrudModal
        isOpen={isOpen && selectedDetail !== null}
        title="Detail Item Operasional"
        subtitle={detailSubtitle}
        testId="view-operasional-detail-modal"
        layout="split"
        modalSize="expanded"
        fields={detailFields}
        summary={
          <SummaryBanner
            label={`Total ${detailLabel}`}
            value={`${formatCapitalIdr(detailTotal)} (${formatOperasionalNumber(detailTotal)})`}
            testId="view-operasional-detail-summary"
          />
        }
        emptyMessage="Belum ada item operasional pada periode ini."
        pageSize={10}
        items={detailItems}
        readOnly={true}
        onClose={() => setSelectedDetail(null)}
      />
    </>
  );
};
