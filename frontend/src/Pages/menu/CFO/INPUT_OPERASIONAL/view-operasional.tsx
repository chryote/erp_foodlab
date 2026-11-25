import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type {
  ExpenseCategory,
  ExpenseItem,
  ExpenseType,
} from '@/api/client';
import {
  CardHeader,
  SummaryBanner,
} from '@/components/ui';
import {
  useCompanyCrudResource,
  useMasterOperasionalCrudResource,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  formatCurrentMonthDateRange,
  formatOperasionalNumber,
} from '@/modules/CFO/ViewOperasionalModal';

type SelectedDetail =
  | { kind: 'category'; category: ExpenseCategory }
  | { kind: 'type'; type: ExpenseType; categoryName: string };

function isInMonth(
  dateValue: string | null | undefined,
  referenceDate: Date
): boolean {
  if (!dateValue) return true;
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue.trim());
  if (ymdMatch && !dateValue.includes('T')) {
    return (
      Number(ymdMatch[1]) === referenceDate.getFullYear() &&
      Number(ymdMatch[2]) - 1 === referenceDate.getMonth()
    );
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return true;
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

export default function CfoViewOperasionalPage() {
  const { companyId: routeCompanyId } = useParams();
  const parsedCompanyId = Number(routeCompanyId);
  const selectedCompanyId =
    Number.isSafeInteger(parsedCompanyId) && parsedCompanyId > 0
      ? parsedCompanyId
      : getActiveCompanyId();
  const companyResource = useCompanyCrudResource(true);
  const company =
    companyResource.companies.find((item) => item.id === selectedCompanyId) ??
    null;
  const resource = useMasterOperasionalCrudResource(Boolean(company), company);

  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(
    null
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const effectiveDate = useMemo(() => new Date(), []);
  const dateRangeLabel = useMemo(
    () => formatCurrentMonthDateRange(effectiveDate),
    [effectiveDate]
  );

  useEffect(() => {
    setSelectedDetail(null);
    setSearch('');
    setPage(1);
  }, [company?.id]);

  const currentMonthItems = useMemo(
    () =>
      resource.items.filter((item) =>
        isInMonth(item.purchased_on || item.created_at, effectiveDate)
      ),
    [effectiveDate, resource.items]
  );

  const {
    amountByCategoryId,
    amountByTypeId,
    typesByCategoryId,
  } = useMemo(() => {
    const categoryTotals = new Map<number, number>();
    const typeTotals = new Map<number, number>();
    const typesMap = new Map<number, ExpenseType>();
    const groupedTypes = new Map<number, ExpenseType[]>();

    for (const type of resource.types) {
      typesMap.set(type.id, type);
      const categoryId = Number(type.expense_category_id);
      const existing = groupedTypes.get(categoryId);
      if (existing) {
        existing.push(type);
      } else {
        groupedTypes.set(categoryId, [type]);
      }
    }

    for (const item of currentMonthItems) {
      const amount = Number(item.amount) || 0;
      const typeId = Number(item.expense_type_id);
      const categoryId = resolveItemCategoryId(item, typesMap);

      if (Number.isFinite(categoryId) && categoryId > 0) {
        categoryTotals.set(
          categoryId,
          (categoryTotals.get(categoryId) ?? 0) + amount
        );
      }
      if (Number.isFinite(typeId) && typeId > 0) {
        typeTotals.set(typeId, (typeTotals.get(typeId) ?? 0) + amount);
      }
    }

    return {
      amountByCategoryId: categoryTotals,
      amountByTypeId: typeTotals,
      typesByCategoryId: groupedTypes,
      typeLookup: typesMap,
    };
  }, [currentMonthItems, resource.types]);


  const monthTotal = useMemo(
    () =>
      currentMonthItems.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      ),
    [currentMonthItems]
  );

  const error = companyResource.error ?? resource.error;

  return (
    <div className="flex flex-col gap-5">
      <CardHeader
        eyebrow={`CFO / Input Operasional${company ? ` / ${company.name}` : ''}`}
        title="View Operasional"
        subtitle="Ringkasan pengeluaran berdasarkan kategori dan tipe."
      />
      <div className="grid gap-3 pb-5 sm:grid-cols-2">
        <div
          className="rounded-xl border border-border bg-background px-4 py-3 text-center text-sm font-semibold"
          data-testid="view-operasional-date-range"
        >
          {dateRangeLabel}
        </div>
        <SummaryBanner
          label="Total Bulan Ini"
          value={`${formatCapitalIdr(monthTotal)} (${formatOperasionalNumber(monthTotal)})`}
          testId="view-operasional-month-total"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
        >
          {error}
        </div>
      )}

      {companyResource.loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Memuat data perusahaan...
        </p>
      ) : !company ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Perusahaan untuk halaman ini tidak ditemukan.
        </p>
      ) : (
        <>
          <CardHeader
            title="Ringkasan Kategori dan Tipe"
            subtitle={dateRangeLabel}
          />
          <div className="flex flex-col gap-5 px-6 pb-6">
            {resource.loading && resource.categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Memuat data operasional...
              </p>
            ) : resource.categories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Belum ada data operasional.
              </p>
            ) : (
              resource.categories.map((category) => {
                const categoryTotal =
                  amountByCategoryId.get(category.id) ?? 0;
                const categoryTypes =
                  typesByCategoryId.get(category.id) ?? [];
                return (
                  <section
                    key={category.id}
                    data-testid={`view-operasional-category-${category.id}`}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        {category.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDetail({ kind: 'category', category });
                          setSearch('');
                          setPage(1);
                        }}
                        data-testid={`view-operasional-category-amount-${category.id}`}
                        className="cursor-pointer rounded px-1.5 py-0.5 text-right text-sm font-semibold tabular-nums text-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:underline"
                      >
                        {formatOperasionalNumber(categoryTotal)}
                      </button>
                    </div>
                    {categoryTypes.length > 0 && (
                      <div className="flex flex-col gap-1.5 pl-4">
                        {categoryTypes.map((type) => {
                          const typeTotal = amountByTypeId.get(type.id) ?? 0;
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
                                onClick={() => {
                                  setSelectedDetail({
                                    kind: 'type',
                                    type,
                                    categoryName: category.name,
                                  });
                                  setSearch('');
                                  setPage(1);
                                }}
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
                  </section>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
