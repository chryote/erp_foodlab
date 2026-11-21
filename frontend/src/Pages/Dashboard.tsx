import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Landmark,
  Plus,
  ReceiptText,
  Users,
} from 'lucide-react';
import {
  fetchCurrentUser,
  syncActiveCompany,
  type AuthUser,
  type Company,
  type ExpenseItem,
} from '@/api/client';
import {
  Button,
  Card,
  CardHeader,
  DashboardHeader,
} from '@/components/ui';
import { setActiveCompanyId } from '@/lib/activeCompanyStorage';
import {
  useCompanyAssetCrudResource,
  useCapitalOverviewResource,
  useMasterOperasionalCrudResource,
} from '@/lib/cfoResources';
import {
  CapitalCompanyCrudModal,
  formatCapitalIdr,
} from '@/modules/CFO/CapitalCompanyCrudModal';
import { ExpenseItemCrudModal } from '@/modules/CFO/ExpenseItemCrudModal';
import { ViewCompanyAssetModal } from '@/modules/CFO/ViewCompanyAssetModal';
import {
  formatCurrentMonthDateRange,
  ViewOperasionalModal,
} from '@/modules/CFO/ViewOperasionalModal';

type DashboardModal = 'capital' | 'expense' | 'operations' | 'assets' | null;

export interface DashboardProps {
  onLogout?: () => void | Promise<void>;
}

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  loading: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  description,
  icon,
  loading,
}) => (
  <Card className="flex h-full flex-col justify-between gap-5 p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {loading ? 'Memuat...' : value}
        </p>
      </div>
      <span className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</span>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>
  </Card>
);

function isInMonth(
  dateValue: string | null | undefined,
  year: number,
  month: number
): boolean {
  if (!dateValue) {
    return true;
  }

  const value = dateValue.trim();
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateMatch && !value.includes('T')) {
    return Number(dateMatch[1]) === year && Number(dateMatch[2]) - 1 === month;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return true;
  }
  return parsedDate.getFullYear() === year && parsedDate.getMonth() === month;
}

function getExpenseDate(item: ExpenseItem): number {
  const dateValue = item.purchased_on || item.created_at;
  if (!dateValue) {
    return 0;
  }
  const timestamp = new Date(dateValue).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatExpenseDate(dateValue: string | null | undefined): string {
  if (!dateValue) {
    return '-';
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);
  const date =
    dateMatch && !dateValue.includes('T')
      ? new Date(
          Number(dateMatch[1]),
          Number(dateMatch[2]) - 1,
          Number(dateMatch[3])
        )
      : new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getItemCategoryId(
  item: ExpenseItem,
  typeCategoryById: Map<number, number>
): number {
  return Number(
    item.expense_category_id ||
      item.expense_type?.expense_category_id ||
      typeCategoryById.get(Number(item.expense_type_id))
  );
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null
  );
  const [activeModal, setActiveModal] = useState<DashboardModal>(null);
  const currentUserQuery = useQuery<AuthUser>({
    queryKey: ['auth', 'current-user'],
    queryFn: async () => {
      const response = await fetchCurrentUser();
      return response.data;
    },
  });
  const {
    capitalCompanies,
    companies,
    loading: capitalLoading,
    error: capitalError,
  } = useCapitalOverviewResource(true);

  const selectedCompany =
    companies.find((company) => company.id === selectedCompanyId) ??
    companies[0] ??
    null;

  useEffect(() => {
    setActiveCompanyId(selectedCompany?.id ?? null);
  }, [selectedCompany?.id]);

  const {
    categories,
    types,
    items,
    loading: operationsLoading,
    error: operationsError,
  } = useMasterOperasionalCrudResource(Boolean(selectedCompany), selectedCompany);
  const {
    assets: companyAssets,
    loading: assetLoading,
    error: assetError,
  } = useCompanyAssetCrudResource(Boolean(selectedCompany), selectedCompany);

  const referenceDate = new Date();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const dateRange = formatCurrentMonthDateRange(referenceDate);

  const companyCapital = useMemo(
    () =>
      capitalCompanies.filter(
        (record) => record.company_id === selectedCompany?.id
      ),
    [capitalCompanies, selectedCompany?.id]
  );

  const totalCapital = useMemo(
    () =>
      companyCapital.reduce((total, record) => {
        const amount = Number(record.capital);
        return Number.isFinite(amount) ? total + amount : total;
      }, 0),
    [companyCapital]
  );

  const stakeholderCount = useMemo(
    () =>
      new Set(
        companyCapital
          .map((record) => record.stakeholder_name.trim())
          .filter(Boolean)
      ).size,
    [companyCapital]
  );

  const totalAssetValue = useMemo(
    () =>
      companyAssets.reduce((total, asset) => {
        const amount = Number(asset.total_price);
        return Number.isFinite(amount) ? total + amount : total;
      }, 0),
    [companyAssets]
  );

  const currentMonthItems = useMemo(
    () =>
      items.filter((item) =>
        isInMonth(item.purchased_on || item.created_at, year, month)
      ),
    [items, month, year]
  );

  const totalMonthlyExpenses = useMemo(
    () =>
      currentMonthItems.reduce((total, item) => {
        const amount = Number(item.amount);
        return Number.isFinite(amount) ? total + amount : total;
      }, 0),
    [currentMonthItems]
  );

  const typeCategoryById = useMemo(
    () =>
      new Map(
        types.map((type) => [type.id, Number(type.expense_category_id)])
      ),
    [types]
  );

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const typeNameById = useMemo(
    () => new Map(types.map((type) => [type.id, type.name])),
    [types]
  );

  const expenseByCategory = useMemo(() => {
    const totals = new Map<number, number>();
    for (const item of currentMonthItems) {
      const categoryId = getItemCategoryId(item, typeCategoryById);
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        continue;
      }
      const amount = Number(item.amount);
      if (Number.isFinite(amount)) {
        totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount);
      }
    }

    return categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        amount: totals.get(category.id) ?? 0,
      }))
      .sort((left, right) => right.amount - left.amount);
  }, [categories, currentMonthItems, typeCategoryById]);

  const recentExpenses = useMemo(
    () =>
      [...currentMonthItems]
        .sort((left, right) => getExpenseDate(right) - getExpenseDate(left))
        .slice(0, 5),
    [currentMonthItems]
  );

  const handleSelectSeries = (series: number) => {
    const firstCompanyInSeries = companies.find(
      (company) => (company.series ?? 1) === series
    );
    const nextId = firstCompanyInSeries?.id ?? null;
    setSelectedCompanyId(nextId);
    setActiveCompanyId(nextId);
    void Promise.resolve(syncActiveCompany(nextId)).catch(() => undefined);
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompanyId(company.id);
    setActiveCompanyId(company.id);
    void Promise.resolve(syncActiveCompany(company.id)).catch(() => undefined);
  };

  const userError = currentUserQuery.error
    ? currentUserQuery.error instanceof Error
      ? currentUserQuery.error.message
      : 'Gagal memuat data pengguna.'
    : null;
  const errors = [
    userError,
    capitalError,
    operationsError,
    assetError,
  ].filter((message): message is string => Boolean(message));

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        companies={companies}
        selectedSeries={selectedCompany?.series ?? 1}
        selectedCompanyId={selectedCompany?.id ?? null}
        user={currentUserQuery.data}
        userLoading={currentUserQuery.isLoading}
        dateRange={dateRange}
        onSelectSeries={handleSelectSeries}
        onSelectCompany={handleSelectCompany}
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-340 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            PT. Slaras Nusa Foodlab
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedCompany
              ? `Ringkasan keuangan dan operasional untuk ${selectedCompany.name}.`
              : 'Ringkasan keuangan dan operasional perusahaan.'}
          </p>
        </div>

        {errors.map((message) => (
          <div
            key={message}
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {message}
          </div>
        ))}

        {!capitalLoading && companies.length === 0 && (
          <div className="mb-6 rounded-xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
            Belum ada data perusahaan. Tambahkan perusahaan untuk mulai melihat
            ringkasan operasional.
          </div>
        )}

        <section
          aria-label="Ringkasan keuangan dan operasional"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <MetricCard
            label="Total Kapital"
            value={formatCapitalIdr(totalCapital)}
            description={`Total modal terdaftar untuk ${selectedCompany?.name ?? 'perusahaan terpilih'}.`}
            icon={<CircleDollarSign aria-hidden="true" className="size-5" />}
            loading={capitalLoading}
          />
          <MetricCard
            label="Pengeluaran Bulan Ini"
            value={formatCapitalIdr(totalMonthlyExpenses)}
            description={dateRange}
            icon={<ReceiptText aria-hidden="true" className="size-5" />}
            loading={operationsLoading}
          />
          <MetricCard
            label="Item Operasional"
            value={String(currentMonthItems.length)}
            description="Transaksi yang tercatat pada periode ini."
            icon={<ClipboardList aria-hidden="true" className="size-5" />}
            loading={operationsLoading}
          />
          <MetricCard
            label="Pemegang Saham"
            value={String(stakeholderCount)}
            description="Nama pemegang saham unik pada data kapital."
            icon={<Users aria-hidden="true" className="size-5" />}
            loading={capitalLoading}
          />
          <MetricCard
            label="Total Nilai Aset"
            value={formatCapitalIdr(totalAssetValue)}
            description={`${companyAssets.length} aset terdaftar untuk ${selectedCompany?.name ?? 'perusahaan terpilih'}.`}
            icon={<Landmark aria-hidden="true" className="size-5" />}
            loading={assetLoading}
          />
        </section>

        <section
          aria-label="Analisis pengeluaran dan aktivitas"
          className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
        >
          <Card className="p-0">
            <CardHeader
              eyebrow="OPERASIONAL"
              title="Pengeluaran per kategori"
              subtitle={dateRange}
              actions={
                <Button
                  variant="ghost"
                  className="shrink-0"
                  disabled={!selectedCompany}
                  onClick={() => setActiveModal('operations')}
                >
                  Lihat detail
                  <ArrowUpRight aria-hidden="true" className="ml-1 size-4" />
                </Button>
              }
            />
            <div className="space-y-5 px-6 pb-6">
              {operationsLoading ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Memuat data operasional...
                </p>
              ) : expenseByCategory.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Belum ada kategori operasional untuk perusahaan ini.
                </p>
              ) : (
                expenseByCategory.slice(0, 6).map((category) => {
                  const percentage =
                    totalMonthlyExpenses > 0
                      ? Math.min(
                          100,
                          (category.amount / totalMonthlyExpenses) * 100
                        )
                      : 0;

                  return (
                    <div key={category.id}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="truncate font-medium text-foreground">
                          {category.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatCapitalIdr(category.amount)}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label={`Proporsi pengeluaran ${category.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(percentage)}
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-[width]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-0">
            <CardHeader
              eyebrow="AKSES CEPAT"
              title="Kelola data"
              subtitle="Buka pencatatan modal, aset, dan operasional."
            />
            <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                disabled={!selectedCompany}
                onClick={() => setActiveModal('capital')}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-700">
                  <Building2 aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    Daftar kapital perusahaan
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Lihat total modal dan pemegang saham
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>

              <button
                type="button"
                disabled={!selectedCompany}
                onClick={() => setActiveModal('expense')}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="rounded-lg bg-blue-500/10 p-2.5 text-blue-700">
                  <Plus aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    Item operasional
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Catat dan kelola transaksi pengeluaran
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>

              <button
                type="button"
                disabled={!selectedCompany}
                onClick={() => setActiveModal('assets')}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="rounded-lg bg-amber-500/10 p-2.5 text-amber-700">
                  <Landmark aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    View aset perusahaan
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Lihat daftar aset dan total nilainya
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </Card>
        </section>

        <section aria-label="Transaksi terbaru" className="mt-6">
          <Card className="p-0">
            <CardHeader
              eyebrow="AKTIVITAS TERBARU"
              title="Item operasional terbaru"
              subtitle={`${selectedCompany?.name ?? 'Perusahaan'} · ${dateRange}`}
              actions={
                <Button
                  variant="secondary"
                  className="shrink-0"
                  disabled={!selectedCompany}
                  onClick={() => setActiveModal('expense')}
                >
                  Kelola item
                  <ArrowUpRight aria-hidden="true" className="ml-1 size-4" />
                </Button>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 border-collapse text-left text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Nama item
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Kategori / tipe
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Tanggal
                    </th>
                    <th scope="col" className="px-6 py-3 text-right font-semibold">
                      Nominal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {operationsLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-muted-foreground"
                      >
                        Memuat transaksi...
                      </td>
                    </tr>
                  ) : recentExpenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-muted-foreground"
                      >
                        Belum ada item operasional pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    recentExpenses.map((item) => {
                      const categoryId = getItemCategoryId(
                        item,
                        typeCategoryById
                      );
                      const categoryName =
                        categoryNameById.get(categoryId) ??
                        item.expense_category?.name ??
                        '-';
                      const typeName =
                        typeNameById.get(Number(item.expense_type_id)) ??
                        item.expense_type?.name ??
                        '-';

                      return (
                        <tr
                          key={item.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="max-w-65 px-6 py-4">
                            <span className="block truncate font-medium text-foreground">
                              {item.name}
                            </span>
                            {item.detail && (
                              <span className="mt-1 block truncate text-xs text-muted-foreground">
                                {item.detail}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            <span className="block">{categoryName}</span>
                            <span className="mt-1 block text-xs">{typeName}</span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                            {formatExpenseDate(item.purchased_on || item.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right font-medium tabular-nums text-foreground">
                            {formatCapitalIdr(Number(item.amount))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>

      <CapitalCompanyCrudModal
        isOpen={activeModal === 'capital'}
        onClose={() => setActiveModal(null)}
      />
      <ExpenseItemCrudModal
        isOpen={activeModal === 'expense'}
        company={selectedCompany}
        companies={companies}
        onClose={() => setActiveModal(null)}
      />
      <ViewOperasionalModal
        isOpen={activeModal === 'operations'}
        company={selectedCompany}
        referenceDate={referenceDate}
        onClose={() => setActiveModal(null)}
      />
      <ViewCompanyAssetModal
        isOpen={activeModal === 'assets'}
        company={selectedCompany}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};

export default Dashboard;
