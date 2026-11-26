import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { CapitalCompany } from '@/api/client';
import {
  Badge,
  CardHeader,
  DataTable,
  DataTableSearch,
  type DataTableColumn,
} from '@/components/ui';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  useCompanyCrudResource,
  useInfiniteStakeholdersQuery,
  useStakeholdersTotalCapitalQuery,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { useDebouncedSearch } from '@/lib/useDebouncedValue';

type SortDirection = 'asc' | 'desc';
type StakeholderSortKey = 'stakeholder_name' | 'capital';

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
  const stakeholderLoading = stakeholderListQuery.isLoading;

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
    ],
    [totalCapital]
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
            <>
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Total Kapital {selectedCompany.name}
                </span>
                <p className="text-lg font-bold">
                  {formatCapitalIdr(totalCapital)}
                </p>
              </div>

              <div className="mt-2">
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}
