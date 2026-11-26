import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type {
  ExpenseCategory,
  ExpenseItem,
  ExpenseType,
} from '@/api/client';
import type { DateRange } from 'react-day-picker';
import {
  CardHeader,
  SummaryBanner,
} from '@/components/ui';
import { Calendar } from '@/components/ui/shadcn/calendar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/shadcn/dialog';
import {
  useCompanyCrudResource,
  useMasterOperasionalCrudResource,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import { formatOperasionalNumber } from '@/modules/CFO/ViewOperasionalModal';

type SelectedDetail =
  | { kind: 'category'; category: ExpenseCategory }
  | { kind: 'type'; type: ExpenseType; categoryName: string };

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateKey(dateValue: string): string | null {
  const trimmedValue = dateValue.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);
  if (dateOnlyMatch) {
    const date = new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
    return formatDateKey(date) === trimmedValue ? trimmedValue : null;
  }

  const parsed = new Date(trimmedValue);
  return Number.isNaN(parsed.getTime()) ? null : formatDateKey(parsed);
}

function getMonthDateRange(referenceDate: Date): DateRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  return {
    from: new Date(year, month, 1),
    to: new Date(year, month + 1, 0),
  };
}

function formatDateRangeLabel(range: DateRange): string {
  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  if (!range.from) return 'Pilih rentang tanggal';
  return `${formatter.format(range.from)} - ${formatter.format(range.to ?? range.from)}`;
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

  const [, setSelectedDetail] = useState<SelectedDetail | null>(
    null
  );
  const [, setSearch] = useState('');
  const [, setPage] = useState(1);
  const effectiveDate = useMemo(() => new Date(), []);
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange>(() =>
    getMonthDateRange(effectiveDate)
  );
  const [draftDateRange, setDraftDateRange] =
    useState<DateRange>(appliedDateRange);
  const [isSelectingEndDate, setIsSelectingEndDate] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(effectiveDate);
  const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false);
  const [dateRangeError, setDateRangeError] = useState('');
  const dateRangeLabel = useMemo(
    () => formatDateRangeLabel(appliedDateRange),
    [appliedDateRange]
  );

  useEffect(() => {
    setSelectedDetail(null);
    setSearch('');
    setPage(1);
  }, [company?.id]);

  const filteredItems = useMemo(
    () =>
      resource.items.filter((item) => {
        const dateValue = item.purchased_on || item.created_at;
        if (!dateValue) return true;
        const dateKey = getDateKey(dateValue);
        if (!dateKey || !appliedDateRange.from || !appliedDateRange.to) {
          return true;
        }
        return (
          dateKey >= formatDateKey(appliedDateRange.from) &&
          dateKey <= formatDateKey(appliedDateRange.to)
        );
      }),
    [resource.items, appliedDateRange]
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

    for (const item of filteredItems) {
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
  }, [filteredItems, resource.types]);


  const periodTotal = useMemo(
    () =>
      filteredItems.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      ),
    [filteredItems]
  );

  const error = companyResource.error ?? resource.error;

  const handleDateRangeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftDateRange.from || !draftDateRange.to) {
      setDateRangeError('Pilih tanggal mulai dan tanggal akhir.');
      return;
    }

    setAppliedDateRange(draftDateRange);
    setIsSelectingEndDate(false);
    setDateRangeError('');
    setIsDateRangeDialogOpen(false);
  };

  const selectDatePreset = (range: DateRange, month: Date) => {
    setDraftDateRange(range);
    setCalendarMonth(month);
    setIsSelectingEndDate(false);
    setDateRangeError('');
  };

  return (
    <div className="flex flex-col gap-5">
      <CardHeader
        eyebrow={`CFO / Input Operasional${company ? ` / ${company.name}` : ''}`}
        title="View Operasional"
        subtitle="Ringkasan pengeluaran berdasarkan kategori dan tipe."
      />
      <div className="grid gap-3 pb-5 sm:grid-cols-2">
        <Dialog
          open={isDateRangeDialogOpen}
          onOpenChange={(open) => {
            setIsDateRangeDialogOpen(open);
            if (open) {
              setDraftDateRange(appliedDateRange);
              setIsSelectingEndDate(false);
              setDateRangeError('');
            }
          }}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              data-testid="view-operasional-date-range"
              aria-label="Pilih rentang tanggal operasional"
              className="rounded-xl border border-border bg-background px-4 py-3 text-center text-sm font-semibold transition-colors hover:bg-muted"
            >
              {dateRangeLabel}
            </button>
          </DialogTrigger>
          <DialogContent
            data-testid="view-operasional-date-range-dialog"
            className="w-[calc(100%-2rem)] max-w-sm p-3"
          >
            <DialogHeader className="flex-col">
              <DialogTitle>Pilih Rentang Tanggal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDateRangeSubmit}>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="view-operasional-preset-this-month"
                  onClick={() =>
                    selectDatePreset(
                      getMonthDateRange(effectiveDate),
                      effectiveDate
                    )
                  }
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Pilih bulan ini
                </button>
                <button
                  type="button"
                  data-testid="view-operasional-preset-visible-month"
                  onClick={() =>
                    selectDatePreset(
                      getMonthDateRange(calendarMonth),
                      calendarMonth
                    )
                  }
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Pilih bulan yang tampil
                </button>
              </div>
              <Calendar
                mode="range"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={draftDateRange}
                fixedWeeks
                captionLayout='dropdown'
                modifiersClassNames={{ today: 'calendar-today' }}
                disabled={
                  isSelectingEndDate && draftDateRange.from
                    ? { before: draftDateRange.from }
                    : undefined
                }
                onSelect={(_, selectedDay) => {
                  if (!isSelectingEndDate) {
                    setDraftDateRange({ from: selectedDay });
                    setIsSelectingEndDate(true);
                  } else if (
                    draftDateRange.from &&
                    selectedDay >= draftDateRange.from
                  ) {
                    setDraftDateRange({
                      from: draftDateRange.from,
                      to: selectedDay,
                    });
                    setIsSelectingEndDate(false);
                  }
                  setDateRangeError('');
                }}
                showOutsideDays={false}
                className='view-operasional-calendar p-0 w-full'
              />
              {dateRangeError && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {dateRangeError}
                </p>
              )}
              <DialogFooter className="mt-4">
                <button
                  type="button"
                  onClick={() => setIsDateRangeDialogOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Terapkan
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <SummaryBanner
          label="Total Periode Dipilih"
          value={`${formatCapitalIdr(periodTotal)} (${formatOperasionalNumber(periodTotal)})`}
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
