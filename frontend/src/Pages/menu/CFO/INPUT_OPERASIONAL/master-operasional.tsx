import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { ExpenseCategory, ExpenseType } from '@/api/client';
import {
  Button,
  CardHeader,
  ConfirmDialog,
  DataTable,
  SelectInput,
  TextInput,
  type DataTableColumn,
} from '@/components/ui';
import {
  useInfiniteExpenseCategoriesQuery,
  useInfiniteExpenseTypesQuery,
  useCompanyCrudResource,
  useMasterOperasionalCrudResource,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

type ActiveTab = 'kategori' | 'tipe';
type SortDirection = 'asc' | 'desc';
type CategorySortKey = 'name';
type TypeSortKey = 'name';

type PendingAction =
  | { kind: 'save-category'; id?: number; name: string }
  | {
      kind: 'save-type';
      id?: number;
      categoryId: number;
      name: string;
    }
  | { kind: 'delete-category'; id: number; name: string }
  | { kind: 'delete-type'; id: number; name: string };

export default function CfoMasterOperasionalPage() {
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
  const resource = useMasterOperasionalCrudResource(Boolean(company), company, {
    includeTypes: false,
    includeItems: false,
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('kategori');
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeCategoryId, setTypeCategoryId] = useState('');
  const [editingType, setEditingType] = useState<ExpenseType | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [categorySort, setCategorySort] = useState<{
    key: CategorySortKey;
    direction: SortDirection;
  } | null>(null);
  const [typeSort, setTypeSort] = useState<{
    key: TypeSortKey;
    direction: SortDirection;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [isActionLoading, setIsActionLoading] = useState(false);
  const debouncedCategorySearch = useDebouncedValue(categorySearch);
  const debouncedTypeSearch = useDebouncedValue(typeSearch);
  const categorySortParam = categorySort
    ? `${categorySort.direction === 'desc' ? '-' : ''}${categorySort.key}`
    : '-id';
  const typeSortParam = typeSort
    ? `${typeSort.direction === 'desc' ? '-' : ''}${typeSort.key}`
    : '-id';
  const categoryListQuery = useInfiniteExpenseCategoriesQuery(
    company?.id ?? null,
    debouncedCategorySearch,
    categorySortParam
  );
  const typeListQuery = useInfiniteExpenseTypesQuery(
    company?.id ?? null,
    debouncedTypeSearch,
    typeSortParam
  );
  const listedCategories = useMemo(
    () => categoryListQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [categoryListQuery.data]
  );
  const listedTypes = useMemo(
    () => typeListQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [typeListQuery.data]
  );

  const getTypeCategoryName = useCallback(
    (type: ExpenseType) =>
      resource.categories.find(
        (category) => category.id === Number(type.expense_category_id)
      )?.name ??
      type.expense_category?.name ??
      '',
    [resource.categories]
  );

  const resetCategoryForm = () => {
    setCategoryName('');
    setEditingCategory(null);
  };
  const resetTypeForm = () => {
    setTypeName('');
    setTypeCategoryId('');
    setEditingType(null);
  };

  const submitCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name || !company) return;
    setPendingAction({
      kind: 'save-category',
      ...(editingCategory ? { id: editingCategory.id } : {}),
      name,
    });
  };

  const submitType = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = typeName.trim();
    const categoryId = Number(typeCategoryId);
    if (
      !name ||
      !Number.isSafeInteger(categoryId) ||
      categoryId <= 0 ||
      !resource.categories.some((category) => category.id === categoryId) ||
      !company
    ) {
      return;
    }
    setPendingAction({
      kind: 'save-type',
      ...(editingType ? { id: editingType.id } : {}),
      categoryId,
      name,
    });
  };

  const confirmPendingAction = async () => {
    if (!pendingAction || isActionLoading) return;
    const action = pendingAction;
    setIsActionLoading(true);

    try {
      if (action.kind === 'save-category') {
        const saved = action.id
          ? await resource.updateCategory(action.id, action.name, company?.id)
          : await resource.createCategory(action.name, company?.id);
        if (saved) resetCategoryForm();
      } else if (action.kind === 'save-type') {
        const saved = action.id
          ? await resource.updateType(
              action.id,
              action.categoryId,
              action.name,
              company?.id
            )
          : await resource.createType(
              action.categoryId,
              action.name,
              company?.id
            );
        if (saved) resetTypeForm();
      } else if (action.kind === 'delete-category') {
        if (await resource.removeCategory(action.id)) {
          if (editingCategory?.id === action.id) resetCategoryForm();
        }
      } else if (action.kind === 'delete-type') {
        if (await resource.removeType(action.id)) {
          if (editingType?.id === action.id) resetTypeForm();
        }
      }
      setPendingAction(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const chooseTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    resetCategoryForm();
    resetTypeForm();
  };

  const categoryColumns = useMemo<DataTableColumn<ExpenseCategory>[]>(
    () => [
      {
        key: 'name',
        header: 'Nama Kategori',
        sortable: true,
        render: (row) => row.name,
      },
      {
        key: 'actions',
        header: 'Aksi',
        sticky: true,
        render: (row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              className="h-9 w-9 p-0"
              aria-label={`Ubah kategori ${row.name}`}
              title={`Ubah kategori ${row.name}`}
              data-testid={`operasional-category-edit-${row.id}`}
              onClick={() => {
                setEditingCategory(row);
                setCategoryName(row.name);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0"
              aria-label={`Hapus kategori ${row.name}`}
              title={`Hapus kategori ${row.name}`}
              data-testid={`operasional-category-delete-${row.id}`}
              onClick={() =>
                setPendingAction({
                  kind: 'delete-category',
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

  const typeColumns = useMemo<DataTableColumn<ExpenseType>[]>(
    () => [
      {
        key: 'category',
        header: 'Kategori',
        render: (row) => getTypeCategoryName(row) || '-',
      },
      {
        key: 'name',
        header: 'Nama Tipe',
        sortable: true,
        render: (row) => row.name,
      },
      {
        key: 'actions',
        header: 'Aksi',
        sticky: true,
        render: (row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              className="h-9 w-9 p-0"
              aria-label={`Ubah tipe ${row.name}`}
              title={`Ubah tipe ${row.name}`}
              data-testid={`operasional-type-edit-${row.id}`}
              onClick={() => {
                setEditingType(row);
                setTypeCategoryId(String(row.expense_category_id));
                setTypeName(row.name);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0"
              aria-label={`Hapus tipe ${row.name}`}
              title={`Hapus tipe ${row.name}`}
              data-testid={`operasional-type-delete-${row.id}`}
              onClick={() =>
                setPendingAction({
                  kind: 'delete-type',
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
    [getTypeCategoryName]
  );

  const error = companyResource.error ?? resource.error;

  return (
    <div className="mx-auto max-w-340">
      <div
        role="tablist"
        aria-label="Master Operasional"
        className="mb-4 flex gap-1 border-b border-border lg:hidden"
      >
        {([
          ['kategori', 'Kategori'],
          ['tipe', 'Tipe'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            data-testid={`master-operasional-tab-${tab}`}
            onClick={() => chooseTab(tab)}
            className={`rounded-t-lg border px-4 py-2 text-sm ${
              activeTab === tab
                ? 'border-border border-b-card bg-card font-semibold text-primary'
                : 'border-transparent bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-stretch">
          <section
            className={`${
              activeTab === 'kategori' ? 'flex' : 'hidden'
            } min-w-0 flex-col border-b border-border pb-4 lg:flex lg:h-[calc(100dvh-12rem)] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:px-1`}
            data-testid="master-operasional-kategori-section"
          >
            <CardHeader
              eyebrow='CFO / Input Modal'
              title="Kelola kategori"
            />
            <form
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
              onSubmit={submitCategory}
              data-testid="master-operasional-kategori-form"
            >
              <TextInput
                label="Nama Kategori"
                placeholder="Contoh: Bahan Baku"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                required
                disabled={resource.loading}
                data-testid="master-operasional-category-name"
              />
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="h-9 w-9 p-0"
                  aria-label={editingCategory ? 'Perbarui kategori' : 'Tambah kategori'}
                  title={editingCategory ? 'Perbarui kategori' : 'Tambah kategori'}
                  disabled={resource.loading}
                >
                  {editingCategory ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
                {editingCategory && (
                  <Button
                    type="button"
                    className="h-9 w-9 p-0"
                    aria-label="Batal mengubah kategori"
                    title="Batal"
                    onClick={resetCategoryForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>

            {categoryListQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Memuat data kategori...
              </p>
            ) : (
              <DataTable
                columns={categoryColumns}
                data={listedCategories}
                rowKey={(row) => row.id}
                stickyHeader
                searchValue={categorySearch}
                onSearchChange={setCategorySearch}
                searchLabel="Cari kategori"
                searchPlaceholder="Cari kategori..."
                searchTestId="master-operasional-kategori-search"
                scrollTestId="master-operasional-kategori-table-scroll"
                hasMore={
                  Boolean(categoryListQuery.hasNextPage) &&
                  !categoryListQuery.error
                }
                onLoadMore={() => {
                  if (
                    categoryListQuery.hasNextPage &&
                    !categoryListQuery.isFetchingNextPage
                  ) {
                    void categoryListQuery.fetchNextPage();
                  }
                }}
                isLoadingMore={categoryListQuery.isFetchingNextPage}
                loadMoreError={
                  categoryListQuery.error instanceof Error
                    ? categoryListQuery.error.message
                    : categoryListQuery.error
                      ? 'Gagal memuat kategori operasional.'
                      : null
                }
                onRetryLoadMore={() => {
                  void (categoryListQuery.isFetchNextPageError
                    ? categoryListQuery.fetchNextPage()
                    : categoryListQuery.refetch());
                }}
                sortKey={categorySort?.key ?? null}
                sortDirection={categorySort?.direction}
                onSort={(key) => {
                  if (key !== 'name') return;
                  setCategorySort((current) =>
                    current?.key === key
                      ? {
                          key,
                          direction:
                            current.direction === 'asc' ? 'desc' : 'asc',
                        }
                      : { key, direction: 'asc' }
                  );
                }}
                emptyMessage="Belum ada data kategori operasional."
                emptyTestId="master-operasional-category-empty"
              />
            )}
          </section>

          <section
            className={`${
              activeTab === 'tipe' ? 'flex' : 'hidden'
            } min-w-0 flex-col border-b border-border pb-4 lg:flex lg:h-[calc(100dvh-12rem)] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:px-1`}
            data-testid="master-operasional-tipe-section"
          >
            <div className='hidden md:block mt-5'></div>
            <CardHeader
              title="Kelola Tipe"
            />
            <form
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
              onSubmit={submitType}
              data-testid="master-operasional-tipe-form"
            >
              <SelectInput
                label="Kategori"
                placeholder="Pilih kategori..."
                options={resource.categories.map((category) => ({
                  value: String(category.id),
                  label: category.name,
                }))}
                value={typeCategoryId}
                onChange={(event) => setTypeCategoryId(event.target.value)}
                required
                disabled={resource.loading || resource.categories.length === 0}
                data-testid="master-operasional-type-category"
              />
              <TextInput
                label="Nama Tipe"
                placeholder="Contoh: Dairy"
                value={typeName}
                onChange={(event) => setTypeName(event.target.value)}
                required
                disabled={resource.loading}
                data-testid="master-operasional-type-name"
              />
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="h-9 w-9 p-0"
                  aria-label={editingType ? 'Perbarui tipe' : 'Tambah tipe'}
                  title={editingType ? 'Perbarui tipe' : 'Tambah tipe'}
                  disabled={resource.loading}
                >
                  {editingType ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
                {editingType && (
                  <Button
                    type="button"
                    className="h-9 w-9 p-0"
                    aria-label="Batal mengubah tipe"
                    title="Batal"
                    onClick={resetTypeForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>

            {typeListQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Memuat data tipe...
              </p>
            ) : (
              <DataTable
                columns={typeColumns}
                data={listedTypes}
                rowKey={(row) => row.id}
                stickyHeader
                searchValue={typeSearch}
                onSearchChange={setTypeSearch}
                searchLabel="Cari tipe"
                searchPlaceholder="Cari tipe..."
                searchTestId="master-operasional-tipe-search"
                scrollTestId="master-operasional-tipe-table-scroll"
                hasMore={
                  Boolean(typeListQuery.hasNextPage) && !typeListQuery.error
                }
                onLoadMore={() => {
                  if (
                    typeListQuery.hasNextPage &&
                    !typeListQuery.isFetchingNextPage
                  ) {
                    void typeListQuery.fetchNextPage();
                  }
                }}
                isLoadingMore={typeListQuery.isFetchingNextPage}
                loadMoreError={
                  typeListQuery.error instanceof Error
                    ? typeListQuery.error.message
                    : typeListQuery.error
                      ? 'Gagal memuat tipe operasional.'
                      : null
                }
                onRetryLoadMore={() => {
                  void (typeListQuery.isFetchNextPageError
                    ? typeListQuery.fetchNextPage()
                    : typeListQuery.refetch());
                }}
                sortKey={typeSort?.key ?? null}
                sortDirection={typeSort?.direction}
                onSort={(key) => {
                  if (key !== 'name') return;
                  setTypeSort((current) =>
                    current?.key === key
                      ? {
                          key,
                          direction:
                            current.direction === 'asc' ? 'desc' : 'asc',
                        }
                      : { key, direction: 'asc' }
                  );
                }}
                emptyMessage="Belum ada data tipe operasional."
                emptyTestId="master-operasional-type-empty"
              />
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={
          pendingAction?.kind.startsWith('delete')
            ? 'Konfirmasi Hapus'
            : pendingAction?.id
              ? 'Konfirmasi Perubahan'
              : 'Konfirmasi Penambahan'
        }
        message={
          pendingAction?.kind.startsWith('delete')
            ? `Hapus "${pendingAction.name}"?`
            : pendingAction?.kind === 'save-category'
              ? `${pendingAction.id ? 'Perbarui' : 'Tambahkan'} kategori "${pendingAction.name}"?`
              : pendingAction?.kind === 'save-type'
                ? `${pendingAction.id ? 'Perbarui' : 'Tambahkan'} tipe "${pendingAction.name}"?`
                : ''
        }
        cancelLabel={
          <span
            className="flex h-9 w-9 items-center justify-center"
            aria-label="Batal"
            title="Batal"
          >
            <X className="h-4 w-4" />
          </span>
        }
        confirmLabel={
          isActionLoading ? (
            <span
              className="flex items-center gap-2"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {pendingAction?.kind.startsWith('delete')
                ? 'Menghapus...'
                : 'Menyimpan...'}
            </span>
          ) : pendingAction?.kind.startsWith('delete') ? (
            <span
              className="flex h-9 w-9 items-center justify-center"
              aria-label="Hapus"
              title="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </span>
          ) : pendingAction?.id ? (
            <span
              className="flex h-9 w-9 items-center justify-center"
              aria-label="Perbarui"
              title="Perbarui"
            >
              <Save className="h-4 w-4" />
            </span>
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center"
              aria-label="Tambah"
              title="Tambah"
            >
              <Plus className="h-4 w-4" />
            </span>
          )
        }
        loading={resource.loading || isActionLoading}
        testId="master-operasional-confirm"
        onConfirm={confirmPendingAction}
        onCancel={() => {
          if (!isActionLoading) setPendingAction(null);
        }}
      />
    </div>
  );
}
