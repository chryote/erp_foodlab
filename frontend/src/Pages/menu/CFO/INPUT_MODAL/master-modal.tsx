import { useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, X } from 'lucide-react';
import type { CapitalCompany, Company } from '@/api/client';
import {
  Badge,
  Button,
  CardHeader,
  ConfirmDialog,
  DataTable,
  DataTableSearch,
  TextInput,
  type DataTableColumn,
} from '@/components/ui';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  useInfiniteCompaniesQuery,
  useInfiniteStakeholdersQuery,
  useStakeholdersTotalCapitalQuery,
  useCompanyCrudResource,
  useStakeholderCrudResource,
} from '@/lib/cfoResources';
import { useDebouncedSearch } from '@/lib/useDebouncedValue';
import { formatCapitalInput } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';
type CompanySortKey = 'name' | 'series';
type StakeholderSortKey = 'stakeholder_name' | 'capital';

type CompanyPendingAction =
  | { type: 'create'; name: string; series: number }
  | { type: 'update'; id: number; name: string; series: number }
  | { type: 'delete'; id: number; name: string };

type StakeholderPendingAction =
  | { type: 'create'; name: string; capital: number }
  | { type: 'update'; id: number; name: string; capital: number }
  | { type: 'delete'; id: number; name: string };

export default function CfoMasterModalPage() {
  const {
    loading,
    error,
    create,
    update,
    remove,
  } = useCompanyCrudResource(false);
  const [companyName, setCompanyName] = useState('');
  const [companySeries, setCompanySeries] = useState('1');
  const [companyNameSearch, setCompanyNameSearch] = useState('');
  const [companySeriesSearch, setCompanySeriesSearch] = useState('');
  const [debouncedCompanyNameSearch, submitCompanyNameSearch] =
    useDebouncedSearch(companyNameSearch);
  const [debouncedCompanySeriesSearch, submitCompanySeriesSearch] =
    useDebouncedSearch(companySeriesSearch);
  const [companySort, setCompanySort] = useState<{
    key: CompanySortKey;
    direction: SortDirection;
  } | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [companyPendingAction, setCompanyPendingAction] =
    useState<CompanyPendingAction | null>(null);
  const [companyActionLoading, setCompanyActionLoading] = useState(false);
  const companySortParam = companySort
    ? `${companySort.direction === 'desc' ? '-' : ''}${companySort.key}`
    : '-id';
  const companyListQuery = useInfiniteCompaniesQuery(
    debouncedCompanyNameSearch,
    debouncedCompanySeriesSearch,
    companySortParam
  );
  const companies = useMemo(
    () => companyListQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [companyListQuery.data]
  );

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsStakeholderModalOpen(true);
  };

  const closeStakeholderModal = () => {
    setIsStakeholderModalOpen(false);
  };

  const resetCompanyForm = () => {
    setEditingCompany(null);
    setCompanyName('');
    setCompanySeries('1');
  };

  const submitCompany = () => {
    const name = companyName.trim();
    const parsedSeries = parseInt(companySeries, 10);
    const series =
      Number.isFinite(parsedSeries) && parsedSeries >= 1 ? parsedSeries : 1;
    if (!name) return;

    if (editingCompany) {
      setCompanyPendingAction({
        type: 'update',
        id: editingCompany.id,
        name,
        series,
      });
    } else {
      setCompanyPendingAction({ type: 'create', name, series });
    }
  };

  const confirmCompanyAction = async () => {
    if (!companyPendingAction || companyActionLoading) return;
    setCompanyActionLoading(true);
    try {
      if (companyPendingAction.type === 'delete') {
        const removed = await remove(companyPendingAction.id);
        if (removed && selectedCompany?.id === companyPendingAction.id) {
          setSelectedCompany(null);
          setIsStakeholderModalOpen(false);
        }
      } else if (companyPendingAction.type === 'update') {
        const updated = await update(
          companyPendingAction.id,
          companyPendingAction.name,
          companyPendingAction.series
        );
        if (updated) {
          setSelectedCompany((prev) =>
            prev?.id === updated.id ? updated : prev
          );
          resetCompanyForm();
        }
      } else {
        await create(companyPendingAction.name, companyPendingAction.series);
        resetCompanyForm();
      }
      setCompanyPendingAction(null);
    } finally {
      setCompanyActionLoading(false);
    }
  };

  const companyColumns = useMemo<DataTableColumn<Company>[]>(
    () => [
      {
        key: 'name',
        header: 'Nama Perusahaan',
        sortable: true,
        render: (row) => row.name,
      },
      {
        key: 'series',
        header: 'Seri',
        sortable: true,
        render: (row) => `Seri ${row.series ?? 1}`,
      },
      {
        key: 'actions',
        header: 'Aksi',
        sticky: true,
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="h-9 w-9 p-0"
              aria-label={`Perbarui ${row.name}`}
              title={`Perbarui ${row.name}`}
              onClick={() => {
                setEditingCompany(row);
                setCompanyName(row.name);
                setCompanySeries(String(row.series ?? 1));
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => selectCompany(row)}
              data-testid={`stakeholder-row-${row.id}`}
            >
              <Eye className='h-4 w-4'/>
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0"
              aria-label={`Hapus ${row.name}`}
              title={`Hapus ${row.name}`}
              onClick={() =>
                setCompanyPendingAction({
                  type: 'delete',
                  id: row.id,
                  name: row.name,
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const {
    loading: stakeholderMutationLoading,
    error: stakeholderError,
    create: createStakeholder,
    update: updateStakeholder,
    remove: removeStakeholder,
  } = useStakeholderCrudResource(false, selectedCompany);
  const [stakeholderName, setStakeholderName] = useState('');
  const [stakeholderCapital, setStakeholderCapital] = useState('');
  const [editingStakeholder, setEditingStakeholder] =
    useState<CapitalCompany | null>(null);
  const [stakeholderPendingAction, setStakeholderPendingAction] =
    useState<StakeholderPendingAction | null>(null);
  const [stakeholderActionLoading, setStakeholderActionLoading] =
    useState(false);
  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [debouncedStakeholderSearch, submitStakeholderSearch] =
    useDebouncedSearch(stakeholderSearch);
  const [stakeholderSort, setStakeholderSort] = useState<{
    key: StakeholderSortKey;
    direction: SortDirection;
  } | null>(null);
  const stakeholderSortParam = stakeholderSort
    ? `${stakeholderSort.direction === 'desc' ? '-' : ''}${stakeholderSort.key}`
    : '-id';
  const stakeholderListQuery = useInfiniteStakeholdersQuery(
    selectedCompany?.id ?? null,
    debouncedStakeholderSearch,
    stakeholderSortParam
  );
  const stakeholderTotalCapitalQuery = useStakeholdersTotalCapitalQuery(
    selectedCompany?.id ?? null
  );
  const stakeholders = useMemo(
    () =>
      stakeholderListQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [stakeholderListQuery.data]
  );
  const stakeholderLoading =
    stakeholderListQuery.isLoading || stakeholderMutationLoading;
  const stakeholderListError =
    stakeholderListQuery.error ?? stakeholderTotalCapitalQuery.error;
  const stakeholderListErrorMessage =
    stakeholderListError instanceof Error
      ? stakeholderListError.message
      : stakeholderListError
        ? 'Gagal memuat data pemegang saham.'
        : null;

  const resetStakeholderForm = () => {
    setEditingStakeholder(null);
    setStakeholderName('');
    setStakeholderCapital('');
  };

  const submitStakeholder = () => {
    const name = stakeholderName.trim();
    const normalizedCapital = stakeholderCapital
      .replace(/\./g, '')
      .replace(',', '.');
    const capital = normalizedCapital ? Number(normalizedCapital) : Number.NaN;
    if (!name || !Number.isFinite(capital)) return;

    if (editingStakeholder) {
      setStakeholderPendingAction({
        type: 'update',
        id: editingStakeholder.id,
        name,
        capital,
      });
    } else {
      setStakeholderPendingAction({ type: 'create', name, capital });
    }
  };

  const confirmStakeholderAction = async () => {
    if (!stakeholderPendingAction || stakeholderActionLoading) return;
    setStakeholderActionLoading(true);
    try {
      if (stakeholderPendingAction.type === 'delete') {
        await removeStakeholder(stakeholderPendingAction.id);
      } else if (stakeholderPendingAction.type === 'update') {
        await updateStakeholder(
          stakeholderPendingAction.id,
          stakeholderPendingAction.name,
          stakeholderPendingAction.capital
        );
        resetStakeholderForm();
      } else {
        await createStakeholder(
          stakeholderPendingAction.name,
          stakeholderPendingAction.capital
        );
        resetStakeholderForm();
      }
      setStakeholderPendingAction(null);
    } finally {
      setStakeholderActionLoading(false);
    }
  };

  const totalCapital = useMemo(
    () =>
      stakeholderTotalCapitalQuery.data ??
      stakeholderListQuery.data?.pages[0]?.meta.total_capital ??
      stakeholders.reduce((sum, item) => sum + (Number(item.capital) || 0), 0),
    [
      stakeholderListQuery.data,
      stakeholderTotalCapitalQuery.data,
      stakeholders,
    ]
  );

  const stakeholderColumns = useMemo<DataTableColumn<CapitalCompany>[]>(
    () => [
      {
        key: 'stakeholder_name',
        header: 'Nama Pemegang Saham',
        sortable: true,
        render: (row) => row.stakeholder_name,
      },
      {
        key: 'capital',
        header: 'Kapital',
        sortable: true,
        render: (row) => formatCapitalIdr(Number(row.capital)),
      },
      {
        key: 'capital_share_percentage',
        header: 'Porsi Kapital (%)',
        render: (row) => {
          const share =
            totalCapital > 0
              ? ((Number(row.capital) || 0) / totalCapital) * 100
              : 0;
          return (
            <Badge className="whitespace-nowrap">
              {share.toLocaleString('id-ID', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              %
            </Badge>
          );
        },
      },
      {
        key: 'actions',
        header: 'Aksi',
        sticky: true,
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="h-9 w-9 p-0"
              aria-label={`Perbarui ${row.stakeholder_name}`}
              title={`Perbarui ${row.stakeholder_name}`}
              onClick={() => {
                setEditingStakeholder(row);
                setStakeholderName(row.stakeholder_name);
                setStakeholderCapital(
                  Number(row.capital).toLocaleString('id-ID', {
                    maximumFractionDigits: 2,
                  })
                );
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0"
              aria-label={`Hapus ${row.stakeholder_name}`}
              title={`Hapus ${row.stakeholder_name}`}
              onClick={() =>
                setStakeholderPendingAction({
                  type: 'delete',
                  id: row.id,
                  name: row.stakeholder_name,
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [totalCapital]
  );

  const companyConfirmMessage =
    companyPendingAction?.type === 'delete'
      ? `Hapus perusahaan ${companyPendingAction.name}?`
      : companyPendingAction?.type === 'update'
        ? `Perbarui data perusahaan ${companyPendingAction.name}?`
        : 'Tambah perusahaan baru?';

  const stakeholderConfirmMessage =
    stakeholderPendingAction?.type === 'delete'
      ? `Hapus pemegang saham ${stakeholderPendingAction.name}?`
      : stakeholderPendingAction?.type === 'update'
        ? `Perbarui data pemegang saham ${stakeholderPendingAction.name}?`
        : 'Tambah pemegang saham baru?';

  const companyConfirmLabel = companyActionLoading
    ? companyPendingAction?.type === 'delete'
      ? 'Menghapus...'
      : 'Menyimpan...'
    : companyPendingAction?.type === 'delete'
      ? (
          <span
            className="flex h-9 w-9 items-center justify-center"
            aria-label="Hapus"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </span>
        )
      : 'Konfirmasi';

  const stakeholderConfirmLabel = stakeholderActionLoading
    ? stakeholderPendingAction?.type === 'delete'
      ? 'Menghapus...'
      : 'Menyimpan...'
    : stakeholderPendingAction?.type === 'delete'
      ? (
          <span
            className="flex h-9 w-9 items-center justify-center"
            aria-label="Hapus"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </span>
        )
      : 'Konfirmasi';

  return (
    <div className="mx-auto max-w-340">
      <div data-testid="master-modal-card">
        {selectedCompany && isStakeholderModalOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            onClick={closeStakeholderModal}
          />
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          <section
            className="min-w-0 border-b border-border lg:flex lg:h-[calc(100dvh-12rem)] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:px-1"
            data-testid="perusahaan-crud-page"
          >
            <CardHeader
              eyebrow="CFO / Input Modal"
              title="Manajemen Perusahaan"
              subtitle="Kelola data perusahaan pada modul CFO"
            />
            <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              {error && (
                <p className="mb-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <form
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitCompany();
                }}
              >
                <TextInput
                  id="company-name"
                  label="Nama Perusahaan"
                  value={companyName}
                  placeholder="Contoh: PT. ABC DEF"
                  onChange={(event) => setCompanyName(event.target.value)}
                />
                <TextInput
                  id="company-series"
                  label="Seri"
                  type="number"
                  min={1}
                  step={1}
                  value={companySeries}
                  onChange={(event) => setCompanySeries(event.target.value)}
                />
                <div className="flex gap-2">
                  {editingCompany ? (
                    <Button
                      type="submit"
                      className="h-9 w-9 p-0"
                      aria-label="Perbarui perusahaan"
                      title="Perbarui perusahaan"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit">Tambah</Button>
                  )}
                  {editingCompany && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetCompanyForm}
                    >
                      Batal
                    </Button>
                  )}
                </div>
              </form>
              <div className="mt-2">
                <DataTableSearch
                  searchValue={companyNameSearch}
                  searchLabel="Cari nama perusahaan"
                  searchPlaceholder="Cari nama perusahaan..."
                  searchTestId="perusahaan-table-search"
                  secondarySearchValue={companySeriesSearch}
                  onSecondarySearchChange={setCompanySeriesSearch}
                  secondarySearchLabel="Cari seri perusahaan"
                  secondarySearchPlaceholder="Cari seri..."
                  secondarySearchTestId="perusahaan-series-search"
                  secondarySearchType="number"
                  onSearchChange={setCompanyNameSearch}
                  onSearchSubmit={() => {
                    submitCompanyNameSearch();
                    submitCompanySeriesSearch();
                  }}
                />
              </div>
              {loading || companyListQuery.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Memuat data perusahaan...
                </p>
              ) : (
                <DataTable
                  columns={companyColumns}
                  data={companies}
                  rowKey={(row) => row.id}
                  stickyHeader
                  showSearch={false}
                  searchValue={companyNameSearch}
                  onSearchChange={setCompanyNameSearch}
                  secondarySearchValue={companySeriesSearch}
                  onSecondarySearchChange={setCompanySeriesSearch}
                  scrollTestId="perusahaan-table-scroll"
                  hasMore={
                    Boolean(companyListQuery.hasNextPage) &&
                    !companyListQuery.isFetchNextPageError
                  }
                  onLoadMore={() => {
                    if (
                      companyListQuery.hasNextPage &&
                      !companyListQuery.isFetchingNextPage
                    ) {
                      void companyListQuery.fetchNextPage();
                    }
                  }}
                  isLoadingMore={companyListQuery.isFetchingNextPage}
                  loadMoreError={
                    companyListQuery.error instanceof Error
                      ? companyListQuery.error.message
                      : companyListQuery.error
                        ? 'Gagal memuat data perusahaan.'
                        : null
                  }
                  onRetryLoadMore={() => {
                    if (companyListQuery.isFetchNextPageError) {
                      void companyListQuery.fetchNextPage();
                    } else {
                      void companyListQuery.refetch();
                    }
                  }}
                  sortKey={companySort?.key ?? null}
                  sortDirection={companySort?.direction}
                  onSort={(key) => {
                    if (key !== 'name' && key !== 'series') return;
                    setCompanySort((current) =>
                      current?.key === key
                        ? {
                            key,
                            direction:
                              current.direction === 'asc' ? 'desc' : 'asc',
                          }
                        : { key, direction: 'asc' }
                    );
                  }}
                  emptyMessage={
                    debouncedCompanyNameSearch.trim() ||
                    debouncedCompanySeriesSearch.trim()
                      ? 'Tidak ada perusahaan yang cocok dengan pencarian.'
                      : 'Belum ada data perusahaan.'
                  }
                  emptyTestId="perusahaan-empty"
                />
              )}
            </div>
          </section>

          <section
            className={`${
              selectedCompany && isStakeholderModalOpen ? 'block' : 'hidden'
            } fixed inset-4 z-50 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-2xl lg:static lg:flex lg:h-[calc(100dvh-12rem)] lg:flex-col lg:overflow-y-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:py-0 lg:px-1 lg:shadow-none`}
            data-testid="pemegang-saham"
            role={selectedCompany && isStakeholderModalOpen ? 'dialog' : undefined}
            aria-modal={
              selectedCompany && isStakeholderModalOpen ? true : undefined
            }
            aria-label={
              selectedCompany
                ? `Pemegang saham ${selectedCompany.name}`
                : 'Pemegang saham'
            }
          >
            {selectedCompany ? (
              <>
                <div className="pb-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                  <div className='flex flex-row gap-2'>
                    <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex-auto">
                      <span className="text-sm text-muted-foreground">
                        Total Kapital {selectedCompany.name}
                      </span>
                      <p className="text-lg font-bold">
                        {formatCapitalIdr(totalCapital)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="h-9 w-9 p-0 lg:hidden"
                      aria-label="Tutup pemegang saham"
                      title="Tutup"
                      onClick={closeStakeholderModal}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {stakeholderError && (
                    <p className="mb-4 text-sm text-red-600" role="alert">
                      {stakeholderError}
                    </p>
                  )}
                  <form
                    className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_auto] md:items-end"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitStakeholder();
                    }}
                  >
                    <TextInput
                      id="stakeholder-name"
                      label="Nama Pemegang Saham"
                      value={stakeholderName}
                      placeholder="Contoh: Budi Santoso"
                      onChange={(event) =>
                        setStakeholderName(event.target.value)
                      }
                    />
                    <TextInput
                      id="stakeholder-capital"
                      label="Kapital (Rp)"
                      value={stakeholderCapital}
                      placeholder="Contoh: 250.000.000"
                      onChange={(event) =>
                        setStakeholderCapital(
                          formatCapitalInput(event.target.value)
                        )
                      }
                    />
                    <div className="flex gap-2">
                      {editingStakeholder ? (
                        <Button
                          type="submit"
                          className="h-9 w-9 p-0"
                          aria-label="Perbarui pemegang saham"
                          title="Perbarui pemegang saham"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button type="submit">Tambah</Button>
                      )}
                      {editingStakeholder && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={resetStakeholderForm}
                        >
                          Batal
                        </Button>
                      )}
                    </div>
                  </form>
                  <div className="mt-2">
                    <DataTableSearch
                      searchValue={stakeholderSearch}
                      searchLabel="Cari pemegang saham"
                      searchPlaceholder="Cari pemegang saham..."
                      searchTestId="pemegang-saham-table-search"
                      onSearchChange={setStakeholderSearch}
                      onSearchSubmit={submitStakeholderSearch}
                    />
                  </div>
                  {stakeholderLoading ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Memuat data pemegang saham...
                    </p>
                  ) : (
                    <DataTable
                      columns={stakeholderColumns}
                      data={stakeholders}
                      rowKey={(row) => row.id}
                      stickyHeader
                      showSearch={false}
                      searchValue={stakeholderSearch}
                      onSearchChange={setStakeholderSearch}
                      scrollTestId="pemegang-saham-table-scroll"
                      hasMore={
                        Boolean(stakeholderListQuery.hasNextPage) &&
                        !stakeholderListQuery.isFetchNextPageError
                      }
                      onLoadMore={() => {
                        if (
                          stakeholderListQuery.hasNextPage &&
                          !stakeholderListQuery.isFetchingNextPage
                        ) {
                          void stakeholderListQuery.fetchNextPage();
                        }
                      }}
                      isLoadingMore={stakeholderListQuery.isFetchingNextPage}
                      loadMoreError={stakeholderListErrorMessage}
                      onRetryLoadMore={() => {
                        if (stakeholderTotalCapitalQuery.isError) {
                          void stakeholderTotalCapitalQuery.refetch();
                        } else if (stakeholderListQuery.isFetchNextPageError) {
                          void stakeholderListQuery.fetchNextPage();
                        } else {
                          void stakeholderListQuery.refetch();
                        }
                      }}
                      sortKey={stakeholderSort?.key ?? null}
                      sortDirection={stakeholderSort?.direction}
                      onSort={(key) => {
                        if (
                          key !== 'stakeholder_name' &&
                          key !== 'capital'
                        ) {
                          return;
                        }
                        setStakeholderSort((current) =>
                          current?.key === key
                            ? {
                                key,
                                direction:
                                  current.direction === 'asc' ? 'desc' : 'asc',
                              }
                            : { key, direction: 'asc' }
                        );
                      }}
                      emptyMessage={
                        debouncedStakeholderSearch.trim()
                          ? 'Tidak ada pemegang saham yang cocok dengan pencarian.'
                          : 'Belum ada data pemegang saham untuk perusahaan ini.'
                      }
                      emptyTestId="pemegang-saham-empty"
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Pilih perusahaan untuk mengelola pemegang saham.
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={companyPendingAction !== null}
        title={
          companyPendingAction?.type === 'delete'
            ? 'Konfirmasi Hapus Perusahaan'
            : companyPendingAction?.type === 'update'
              ? 'Konfirmasi Perbarui Perusahaan'
              : 'Konfirmasi Tambah Perusahaan'
        }
        message={companyConfirmMessage}
        confirmLabel={companyConfirmLabel}
        loading={companyActionLoading}
        confirmVariant={
          'primary'
        }
        onCancel={() => {
          if (!companyActionLoading) {
            setCompanyPendingAction(null);
          }
        }}
        onConfirm={confirmCompanyAction}
      />

      <ConfirmDialog
        isOpen={stakeholderPendingAction !== null}
        title={
          stakeholderPendingAction?.type === 'delete'
            ? 'Konfirmasi Hapus Pemegang Saham'
            : stakeholderPendingAction?.type === 'update'
              ? 'Konfirmasi Perbarui Pemegang Saham'
              : 'Konfirmasi Tambah Pemegang Saham'
        }
        message={stakeholderConfirmMessage}
        confirmLabel={stakeholderConfirmLabel}
        loading={stakeholderActionLoading}
        confirmVariant={
          'primary'
        }
        onCancel={() => {
          if (!stakeholderActionLoading) {
            setStakeholderPendingAction(null);
          }
        }}
        onConfirm={confirmStakeholderAction}
      />
    </div>
  );
}
