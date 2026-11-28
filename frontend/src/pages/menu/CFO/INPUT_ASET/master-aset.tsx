import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { CompanyAsset } from '@/api/client';
import {
  Button,
  CardHeader,
  ConfirmDialog,
  DataTable,
  DataTableSearch,
  DecimalInput,
  Modal,
  SummaryBanner,
  TextInput,
  type DataTableColumn,
} from '@/components/ui';
import {
  useCompanyAssetMutationResource,
  useCompanyCrudResource,
  useInfiniteCompanyAssetsQuery,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { useDebouncedSearch } from '@/lib/useDebouncedValue';
import { formatCapitalInput } from '@/lib/utils';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';

type SortDirection = 'asc' | 'desc';
type AssetSortKey =
  | 'asset_date'
  | 'name'
  | 'amount'
  | 'price_per_unit'
  | 'total_price';

interface AssetFormValues {
  companyId: string;
  assetDate: string;
  name: string;
  amount: string;
  pricePerUnit: string;
}

interface AssetInput {
  companyId: number;
  assetDate: string;
  name: string;
  amount: number;
  pricePerUnit: number;
}

type PendingAction =
  | { kind: 'save'; id?: number; values: AssetInput }
  | { kind: 'delete'; id: number; name: string };

function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getEmptyForm(companyId: number | null): AssetFormValues {
  return {
    companyId: companyId ? String(companyId) : '',
    assetDate: getTodayDateString(),
    name: '',
    amount: '',
    pricePerUnit: '',
  };
}

export default function CfoMasterAsetPage() {
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
  const assetMutations = useCompanyAssetMutationResource(selectedCompany);

  const [search, setSearch] = useState('');
  const [debouncedSearch, submitSearch] = useDebouncedSearch(search);
  const [assetSort, setAssetSort] = useState<{
    key: AssetSortKey;
    direction: SortDirection;
  } | null>(null);
  const [formValues, setFormValues] = useState<AssetFormValues>(() =>
    getEmptyForm(selectedCompanyId)
  );
  const [editingAsset, setEditingAsset] = useState<CompanyAsset | null>(null);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [isActionLoading, setIsActionLoading] = useState(false);

  const assetSortParam = assetSort
    ? `${assetSort.direction === 'desc' ? '-' : ''}${assetSort.key},-id`
    : '-asset_date,-id';
  const assetListQuery = useInfiniteCompanyAssetsQuery(
    selectedCompany?.id ?? null,
    debouncedSearch,
    assetSortParam,
    Boolean(selectedCompany)
  );
  const assets = useMemo(
    () =>
      (assetListQuery.data?.pages.flatMap((page) => page.data) ?? []).filter(
        (asset) =>
          selectedCompany !== null &&
          Number(asset.company_id) === selectedCompany.id
      ),
    [assetListQuery.data, selectedCompany]
  );
  const loadedAssetValue = useMemo(
    () =>
      assets.reduce((sum, asset) => sum + (Number(asset.total_price) || 0), 0),
    [assets]
  );

  useEffect(() => {
    setFormValues(getEmptyForm(selectedCompanyId));
    setEditingAsset(null);
    setSearch('');
    setAssetSort(null);
  }, [selectedCompanyId]);

  const resetForm = () => {
    setEditingAsset(null);
    setFormValues(getEmptyForm(selectedCompanyId));
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const companyId = selectedCompanyId;
    const amount = Number(formValues.amount.replace(/\./g, ''));
    const pricePerUnit = Number(formValues.pricePerUnit);
    const assetDate = formValues.assetDate.trim();
    const name = formValues.name.trim();

    if (
      companyId === null ||
      !Number.isSafeInteger(companyId) ||
      companyId <= 0 ||
      !assetDate ||
      !name ||
      !Number.isInteger(amount) ||
      amount < 1 ||
      !Number.isFinite(pricePerUnit) ||
      pricePerUnit < 0
    ) {
      return;
    }

    setPendingAction({
      kind: 'save',
      ...(editingAsset ? { id: editingAsset.id } : {}),
      values: { companyId, assetDate, name, amount, pricePerUnit },
    });
  };

  const confirmPendingAction = async () => {
    if (!pendingAction || isActionLoading) return;
    const action = pendingAction;
    setIsActionLoading(true);

    try {
      let success = false;
      if (action.kind === 'delete') {
        success = await assetMutations.removeAsset(action.id);
      } else {
        const saved = action.id
          ? await assetMutations.updateAsset(action.id, action.values)
          : await assetMutations.createAsset(action.values);
        success = saved !== null;
      }

      if (success) {
        resetForm();
        setMobileFormOpen(false);
      }
      setPendingAction(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const beginEditing = (asset: CompanyAsset) => {
    setEditingAsset(asset);
    setFormValues({
      companyId: String(selectedCompanyId),
      assetDate: asset.asset_date,
      name: asset.name,
      amount: formatCapitalInput(String(asset.amount)),
      pricePerUnit: String(asset.price_per_unit),
    });
    if (window.matchMedia?.('(max-width: 1023px)').matches) {
      setMobileFormOpen(true);
    }
  };

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
        render: (asset) => formatCapitalInput(String(asset.amount)),
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
      {
        key: 'actions',
        header: 'Aksi',
        sticky: true,
        render: (asset) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="h-9 w-9 p-0"
              aria-label={`Ubah aset ${asset.name}`}
              title={`Ubah aset ${asset.name}`}
              onClick={() => beginEditing(asset)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0"
              aria-label={`Hapus aset ${asset.name}`}
              title={`Hapus aset ${asset.name}`}
              onClick={() =>
                setPendingAction({
                  kind: 'delete',
                  id: asset.id,
                  name: asset.name,
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

  const renderForm = (formId: string) => (
    <form id={formId} className="flex flex-col gap-4" onSubmit={submitForm}>
      <TextInput
        id={`${formId}-asset-date`}
        label="Tanggal Aset"
        type="date"
        value={formValues.assetDate}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            assetDate: event.target.value,
          }))
        }
        required
      />
      <TextInput
        id={`${formId}-asset-name`}
        label="Nama Aset"
        placeholder="Contoh: Freezer Laboratorium"
        value={formValues.name}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            name: event.target.value,
          }))
        }
        required
      />
      <TextInput
        id={`${formId}-asset-amount`}
        label="Jumlah"
        type="text"
        inputMode="numeric"
        placeholder="Contoh: 1.000"
        value={formValues.amount}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            amount: formatCapitalInput(event.target.value.replace(/\D/g, '')),
          }))
        }
        required
      />
      <DecimalInput
        id={`${formId}-asset-price`}
        label="Harga Satuan"
        placeholder="Contoh: 75.000.000"
        value={formValues.pricePerUnit}
        onChange={(value) =>
          setFormValues((current) => ({
            ...current,
            pricePerUnit: value,
          }))
        }
        required
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={assetMutations.mutationLoading}>
          {editingAsset ? 'Perbarui' : 'Tambah'}
        </Button>
        {editingAsset && (
          <Button
            type="button"
            variant="secondary"
            onClick={resetForm}
            disabled={assetMutations.mutationLoading}
          >
            Batal Ubah
          </Button>
        )}
      </div>
    </form>
  );

  const listErrorMessage =
    assetListQuery.error instanceof Error
      ? assetListQuery.error.message
      : assetListQuery.error
        ? 'Gagal memuat data aset.'
        : null;
  const errorMessage =
    assetMutations.error ?? companyResource.error ?? listErrorMessage;

  return (
    <div className="flex flex-col gap-5">
      <CardHeader
        eyebrow={`CFO / Input Aset${selectedCompany ? ` / ${selectedCompany.name}` : ''}`}
        title="Master Aset"
        subtitle="Kelola daftar aset perusahaan."
      />

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
        >
          {errorMessage}
        </div>
      )}

      <div className="lg:hidden">
        <Button
          onClick={() => setMobileFormOpen(true)}
          data-testid="master-aset-open-form"
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Aset
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section
          className="hidden min-w-0 lg:block lg:border-r lg:border-border lg:pr-6"
          aria-label="Form aset"
          data-testid="master-aset-form-panel"
        >
          <h2 className="mb-4 text-base font-semibold">
            {editingAsset ? 'Perbarui Aset' : 'Tambah Aset'}
          </h2>
          {renderForm('master-aset-desktop-form')}
        </section>

        <section className="min-w-0" aria-label="Daftar aset">
          <SummaryBanner
            label="Total Nilai Aset Dimuat"
            value={formatCapitalIdr(loadedAssetValue)}
            testId="master-aset-total-loaded"
          />
          <div className="mt-4">
            <DataTableSearch
              searchValue={search}
              onSearchChange={setSearch}
              searchLabel="Cari aset"
              searchPlaceholder="Cari nama aset..."
              searchTestId="master-aset-search"
              onSearchSubmit={submitSearch}
            />
          </div>
          <div className="mt-4">
            {assetListQuery.isLoading && assets.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Memuat data aset...
              </p>
            ) : assetListQuery.isError && assets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
                <p>Data aset belum dapat dimuat.</p>
                <Button
                  variant="secondary"
                  onClick={() => void assetListQuery.refetch()}
                >
                  Coba lagi
                </Button>
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
                scrollTestId="master-aset-table-scroll"
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
                emptyTestId="master-aset-empty"
              />
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={mobileFormOpen}
        title={editingAsset ? 'Perbarui Aset' : 'Tambah Aset'}
        subtitle="Isi data aset perusahaan."
        testId="master-aset-form-modal"
        maxWidthClass="max-w-xl"
        onClose={() => setMobileFormOpen(false)}
      >
        {renderForm('master-aset-mobile-form')}
      </Modal>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={
          pendingAction?.kind === 'delete'
            ? 'Konfirmasi Hapus Aset'
            : 'Konfirmasi Simpan Aset'
        }
        message={
          pendingAction?.kind === 'delete'
            ? `Hapus aset "${pendingAction.name}"?`
            : editingAsset
              ? 'Perbarui data aset ini?'
              : 'Tambahkan aset ini?'
        }
        confirmLabel={
          pendingAction?.kind === 'delete'
            ? 'Hapus'
            : editingAsset
              ? 'Perbarui'
              : 'Tambah'
        }
        confirmVariant={pendingAction?.kind === 'delete' ? 'secondary' : 'primary'}
        loading={isActionLoading}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
