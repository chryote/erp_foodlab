import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { CompanyAsset } from '@/api/client';
import {
  CardHeader,
  DataTable,
  DataTableSearch,
  SummaryBanner,
  type DataTableColumn,
} from '@/components/ui';
import {
  useCompanyCrudResource,
  useInfiniteCompanyAssetsQuery,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { useDebouncedSearch } from '@/lib/useDebouncedValue';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';

type SortDirection = 'asc' | 'desc';
type AssetSortKey =
  | 'asset_date'
  | 'name'
  | 'amount'
  | 'price_per_unit'
  | 'total_price';

export default function CfoViewAsetPage() {
  const { companyId: routeCompanyId } = useParams();
  const parsedCompanyId = Number(routeCompanyId);
  const selectedCompanyId =
    Number.isSafeInteger(parsedCompanyId) && parsedCompanyId > 0
      ? parsedCompanyId
      : getActiveCompanyId();
  const companyResource = useCompanyCrudResource(true);
  const company =
    companyResource.companies.find(
      (item) => item.id === selectedCompanyId
    ) ?? null;

  const [search, setSearch] = useState('');
  const [debouncedSearch, submitSearch] = useDebouncedSearch(search);
  const [assetSort, setAssetSort] = useState<{
    key: AssetSortKey;
    direction: SortDirection;
  } | null>(null);
  const assetSortParam = assetSort
    ? `${assetSort.direction === 'desc' ? '-' : ''}${assetSort.key},-id`
    : '-asset_date,-id';
  const assetListQuery = useInfiniteCompanyAssetsQuery(
    company?.id ?? null,
    debouncedSearch,
    assetSortParam,
    Boolean(company)
  );
  const assets = useMemo(
    () => assetListQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [assetListQuery.data]
  );
  const loadedAssetValue = useMemo(
    () =>
      assets.reduce((sum, asset) => sum + (Number(asset.total_price) || 0), 0),
    [assets]
  );

  useEffect(() => {
    setSearch('');
    setAssetSort(null);
  }, [company?.id]);

  const columns = useMemo<DataTableColumn<CompanyAsset>[]>(
    () => [
      {
        key: 'asset_date',
        header: 'Tanggal Aset',
        sortable: true,
        render: (asset) => asset.asset_date,
      },
      {
        key: 'name',
        header: 'Nama Aset',
        sortable: true,
        render: (asset) => asset.name,
      },
      {
        key: 'amount',
        header: 'Jumlah',
        sortable: true,
        render: (asset) => String(asset.amount),
      },
      {
        key: 'price_per_unit',
        header: 'Harga Satuan',
        sortable: true,
        render: (asset) => formatCapitalIdr(Number(asset.price_per_unit)),
      },
      {
        key: 'total_price',
        header: 'Total Harga',
        sortable: true,
        render: (asset) => formatCapitalIdr(Number(asset.total_price)),
      },
    ],
    []
  );

  const listErrorMessage =
    assetListQuery.error instanceof Error
      ? assetListQuery.error.message
      : assetListQuery.error
        ? 'Gagal memuat data aset.'
        : null;
  const errorMessage = companyResource.error ?? listErrorMessage;

  return (
    <div className="flex flex-col gap-5">
      <CardHeader
        eyebrow={`CFO / Input Aset${company ? ` / ${company.name}` : ''}`}
        title="View Aset"
        subtitle="Daftar aset untuk perusahaan yang dipilih."
      />

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
        >
          {errorMessage}
        </div>
      )}

      <SummaryBanner
        label="Total Nilai Aset Dimuat"
        value={formatCapitalIdr(loadedAssetValue)}
        testId="view-aset-total-loaded"
      />

      {!companyResource.loading && company && (
        <div className="mt-4">
          <DataTableSearch
            searchValue={search}
            onSearchChange={setSearch}
            searchLabel="Cari aset"
            searchPlaceholder="Cari nama aset..."
            searchTestId="view-aset-search"
            onSearchSubmit={submitSearch}
          />
        </div>
      )}

      {companyResource.loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Memuat data perusahaan...
        </p>
      ) : !company ? (
        <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
          Perusahaan untuk halaman ini tidak ditemukan.
        </p>
      ) : assetListQuery.isLoading && assets.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Memuat data aset...
        </p>
      ) : assetListQuery.isError && assets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
          <p>Data aset belum dapat dimuat.</p>
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => void assetListQuery.refetch()}
          >
            Coba lagi
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={assets}
          rowKey={(asset) => asset.id}
          stickyHeader
          showSearch={false}
          searchValue={search}
          onSearchChange={setSearch}
          scrollTestId="view-aset-table-scroll"
          hasMore={
            Boolean(assetListQuery.hasNextPage) &&
            !assetListQuery.isFetchNextPageError
          }
          onLoadMore={() => {
            if (
              assetListQuery.hasNextPage &&
              !assetListQuery.isFetchingNextPage
            ) {
              void assetListQuery.fetchNextPage();
            }
          }}
          isLoadingMore={assetListQuery.isFetchingNextPage}
          loadMoreError={
            assetListQuery.isFetchNextPageError
              ? listErrorMessage ?? 'Gagal memuat data berikutnya.'
              : null
          }
          onRetryLoadMore={() => {
            void (assetListQuery.isFetchNextPageError
              ? assetListQuery.fetchNextPage()
              : assetListQuery.refetch());
          }}
          sortKey={assetSort?.key ?? null}
          sortDirection={assetSort?.direction}
          onSort={(key) => {
            if (
              key !== 'asset_date' &&
              key !== 'name' &&
              key !== 'amount' &&
              key !== 'price_per_unit' &&
              key !== 'total_price'
            ) {
              return;
            }
            setAssetSort((current) =>
              current?.key === key
                ? {
                    key,
                    direction:
                      current.direction === 'asc' ? 'desc' : 'asc',
                  }
                : { key, direction: 'asc' }
            );
          }}
          emptyMessage="Belum ada data aset perusahaan."
          emptyTestId="view-aset-empty"
        />
      )}
    </div>
  );
}
