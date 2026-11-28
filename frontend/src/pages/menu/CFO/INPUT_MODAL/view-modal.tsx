import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import type { CapitalCompany } from '@/api/client';
import {
  Badge,
  Button,
  CardHeader,
  ConfirmDialog,
  DataTable,
  DataTableSearch,
  Modal,
  TextInput,
  type DataTableColumn,
} from '@/components/ui';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  useCompanyCrudResource,
  useInfiniteStakeholdersQuery,
  useStakeholderCrudResource,
  useStakeholdersTotalCapitalQuery,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { useDebouncedSearch } from '@/lib/useDebouncedValue';
import { formatCapitalInput } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';
type StakeholderSortKey = 'stakeholder_name' | 'capital';

type StakeholderPendingAction =
  | { type: 'create'; name: string; capital: number }
  | { type: 'update'; id: number; name: string; capital: number }
  | { type: 'delete'; id: number; name: string };

export default function CfoViewModalPage() {
  const { companyId: routeCompanyId } = useParams();
  const parsedCompanyId = Number(routeCompanyId);
  const selectedCompanyId =
    Number.isSafeInteger(parsedCompanyId) && parsedCompanyId > 0
      ? parsedCompanyId
      : getActiveCompanyId();
  const companyResource = useCompanyCrudResource(true);
  const selectedCompany =
    companyResource.companies.find(
      (company) => company.id === selectedCompanyId
    ) ?? null;
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
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024
  );
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
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
  const stakeholderListError =
    stakeholderListQuery.error ?? stakeholderTotalCapitalQuery.error;
  const stakeholderListErrorMessage =
    stakeholderListError instanceof Error
      ? stakeholderListError.message
      : stakeholderListError
        ? 'Gagal memuat data pemegang saham.'
        : null;

  useEffect(() => {
    setStakeholderSearch('');
  }, [selectedCompany?.id]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      setIsMobileViewport(isMobile);
      if (!isMobile) {
        setIsFormModalOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const stakeholderLoading =
    stakeholderListQuery.isLoading || stakeholderMutationLoading;

  const resetStakeholderForm = () => {
    setEditingStakeholder(null);
    setStakeholderName('');
    setStakeholderCapital('');
    setIsFormModalOpen(false);
  };

  const openCreateForm = () => {
    resetStakeholderForm();
    setIsFormModalOpen(isMobileViewport);
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
      let succeeded = false;
      if (stakeholderPendingAction.type === 'delete') {
        succeeded = await removeStakeholder(stakeholderPendingAction.id);
      } else if (stakeholderPendingAction.type === 'update') {
        succeeded = Boolean(
          await updateStakeholder(
            stakeholderPendingAction.id,
            stakeholderPendingAction.name,
            stakeholderPendingAction.capital
          )
        );
      } else {
        succeeded = Boolean(
          await createStakeholder(
            stakeholderPendingAction.name,
            stakeholderPendingAction.capital
          )
        );
      }

      if (succeeded && stakeholderPendingAction.type !== 'delete') {
        resetStakeholderForm();
      }
      setStakeholderPendingAction(null);
    } finally {
      setStakeholderActionLoading(false);
    }
  };

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
                setIsFormModalOpen(isMobileViewport);
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
    [isMobileViewport, totalCapital]
  );

  const stakeholderConfirmMessage =
    stakeholderPendingAction?.type === 'delete'
      ? `Hapus pemegang saham ${stakeholderPendingAction.name}?`
      : stakeholderPendingAction?.type === 'update'
        ? `Perbarui data pemegang saham ${stakeholderPendingAction.name}?`
        : 'Tambah pemegang saham baru?';
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

  const stakeholderForm = (
    <>
      {stakeholderError && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {stakeholderError}
        </p>
      )}
      <form
        className="grid gap-3"
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
          onChange={(event) => setStakeholderName(event.target.value)}
        />
        <TextInput
          id="stakeholder-capital"
          label="Kapital (Rp)"
          value={stakeholderCapital}
          placeholder="Contoh: 250.000.000"
          onChange={(event) =>
            setStakeholderCapital(formatCapitalInput(event.target.value))
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
    </>
  );

  return (
    <div className="mx-auto max-w-340">
      <div data-testid="view-modal-card">
        <section
          className="flex h-[calc(100dvh-12rem)] min-h-0 min-w-0 flex-col"
          data-testid="pemegang-saham"
          aria-label={
            selectedCompany
              ? `Pemegang saham ${selectedCompany.name}`
              : 'Pemegang saham'
          }
        >
          <CardHeader
            eyebrow="CFO / Input Modal"
            title={
              selectedCompany
                ? `Pemegang Saham ${selectedCompany.name}`
                : 'Pemegang Saham'
            }
          />

          {companyResource.loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Memuat data perusahaan...
            </p>
          )}
          {!companyResource.loading && !selectedCompany && (
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Perusahaan tidak ditemukan.
            </div>
          )}
          {selectedCompany && (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              {!isMobileViewport && (
                <section
                  className="min-w-0"
                  data-testid="pemegang-saham-form-section"
                  aria-label="Form pemegang saham"
                >
                  {stakeholderForm}
                </section>
              )}

              <section
                className="flex min-h-0 min-w-0 flex-col"
                data-testid="pemegang-saham-table-section"
                aria-label="Data pemegang saham"
              >
                <div className="mb-4 flex flex-wrap items-start gap-3">
                  <div className="flex-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      Total Kapital {selectedCompany.name}
                    </span>
                    <p className="text-lg font-bold">
                      {formatCapitalIdr(totalCapital)}
                    </p>
                  </div>
                  {isMobileViewport && (
                    <Button
                      variant="primary"
                      onClick={openCreateForm}
                      data-testid="pemegang-saham-open-form-mobile"
                    >
                      Tambah Pemegang Saham
                    </Button>
                  )}
                </div>

                <div className="mb-2">
                  <DataTableSearch
                    searchValue={stakeholderSearch}
                    onSearchChange={setStakeholderSearch}
                    searchLabel="Cari pemegang saham"
                    searchPlaceholder="Cari nama atau kapital pemegang saham..."
                    searchTestId="pemegang-saham-table-search"
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
                      if (key !== 'stakeholder_name' && key !== 'capital') {
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
              </section>
            </div>
          )}
        </section>
      </div>
      <Modal
        isOpen={isMobileViewport && isFormModalOpen}
        title={
          editingStakeholder
            ? 'Perbarui Pemegang Saham'
            : 'Tambah Pemegang Saham'
        }
        testId="pemegang-saham-form-modal"
        onClose={resetStakeholderForm}
      >
        {stakeholderForm}
      </Modal>
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
        confirmVariant="primary"
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
