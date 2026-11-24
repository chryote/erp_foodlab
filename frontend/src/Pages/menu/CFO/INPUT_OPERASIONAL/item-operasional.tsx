import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import type {
  ExpenseCategory,
  ExpenseItem,
  ExpenseType,
} from '@/api/client';
import {
  Button,
  CardHeader,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Pagination,
  SelectInput,
  SummaryBanner,
  TextInput,
  TextareaInput,
  type DataTableColumn,
} from '@/components/ui';
import {
  useCompanyCrudResource,
  useMasterOperasionalCrudResource,
} from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';

interface ItemFormValues {
  categoryId: string;
  typeId: string;
  purchasedOn: string;
  name: string;
  amount: string;
  detail: string;
}

interface ItemMutationValues {
  companyId: number;
  expenseCategoryId: number;
  expenseTypeId: number;
  purchasedOn: string;
  name: string;
  amount: number;
  detail: string | null;
}

type PendingAction =
  | { kind: 'save'; id?: number; values: ItemMutationValues }
  | { kind: 'delete'; id: number; name: string };

const PAGE_SIZE = 10;

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function emptyFormValues(): ItemFormValues {
  return {
    categoryId: '',
    typeId: '',
    purchasedOn: getTodayDateString(),
    name: '',
    amount: '',
    detail: '',
  };
}

interface ItemOperasionalFormProps {
  editingItem: ExpenseItem | null;
  formValues: ItemFormValues;
  categories: ExpenseCategory[];
  availableTypes: ExpenseType[];
  loading: boolean;
  setFormValues: React.Dispatch<React.SetStateAction<ItemFormValues>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function ItemOperasionalForm({
  editingItem,
  formValues,
  categories,
  availableTypes,
  loading,
  setFormValues,
  onSubmit,
  onCancel,
}: ItemOperasionalFormProps) {
  return (
    <form
      className="grid gap-4"
      onSubmit={onSubmit}
      data-testid="operasional-item-form"
    >
      <SelectInput
        label="Kategori"
        placeholder="Pilih kategori..."
        options={categories.map((category) => ({
          value: String(category.id),
          label: category.name,
        }))}
        value={formValues.categoryId}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            categoryId: event.target.value,
            typeId: '',
          }))
        }
        required
        disabled={loading}
        data-testid="operasional-item-category"
      />
      <SelectInput
        label="Tipe"
        placeholder="Pilih tipe..."
        options={availableTypes.map((type) => ({
          value: String(type.id),
          label: type.name,
        }))}
        value={formValues.typeId}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            typeId: event.target.value,
          }))
        }
        required
        disabled={loading || !formValues.categoryId}
        data-testid="operasional-item-type"
      />
      <TextInput
        label="Tanggal Transaksi"
        type="date"
        value={formValues.purchasedOn}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            purchasedOn: event.target.value,
          }))
        }
        required
        disabled={loading}
        data-testid="operasional-item-date"
      />
      <TextInput
        label="Nama Item"
        placeholder="Contoh: Susu Segar"
        value={formValues.name}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            name: event.target.value,
          }))
        }
        required
        disabled={loading}
        data-testid="operasional-item-name"
      />
      <TextInput
        label="Nominal"
        type="number"
        min="0"
        step="0.01"
        placeholder="Contoh: 1500000"
        value={formValues.amount}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            amount: event.target.value,
          }))
        }
        required
        disabled={loading}
        data-testid="operasional-item-amount"
      />
      <TextareaInput
        label="Keterangan"
        placeholder="Contoh: Pembelian bahan baku mingguan"
        value={formValues.detail}
        onChange={(event) =>
          setFormValues((current) => ({
            ...current,
            detail: event.target.value,
          }))
        }
        disabled={loading}
        data-testid="operasional-item-detail"
      />
      <div className="flex items-end gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={
            loading || categories.length === 0 || availableTypes.length === 0
          }
        >
          {editingItem ? 'Perbarui Item' : 'Tambah Item'}
        </Button>
        {editingItem && (
          <Button type="button" onClick={onCancel}>
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 1024;
}

export default function CfoItemOperasionalPage() {
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

  const [formValues, setFormValues] = useState<ItemFormValues>(emptyFormValues);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resource.items.filter((item) => {
      const typeName =
        resource.types.find((type) => type.id === Number(item.expense_type_id))
          ?.name ??
        item.expense_type?.name ??
        '';
      return (
        item.name.toLowerCase().includes(query) ||
        typeName.toLowerCase().includes(query) ||
        (item.detail ?? '').toLowerCase().includes(query) ||
        (item.purchased_on ?? '').toLowerCase().includes(query)
      );
    });
  }, [resource.items, resource.types, search]);

  const columns = useMemo<DataTableColumn<ExpenseItem>[]>(
    () => [
      {
        key: 'purchased_on',
        header: 'Tanggal',
        render: (row) => row.purchased_on ?? '-',
      },
      {
        key: 'expense_type_id',
        header: 'Tipe',
        render: (row) =>
          resource.types.find((type) => type.id === Number(row.expense_type_id))
            ?.name ??
          row.expense_type?.name ??
          '-',
      },
      { key: 'name', header: 'Nama Item', render: (row) => row.name },
      {
        key: 'detail',
        header: 'Keterangan',
        render: (row) => row.detail || '-',
      },
      {
        key: 'amount',
        header: 'Nominal',
        render: (row) => formatCapitalIdr(Number(row.amount)),
      },
      {
        key: 'actions',
        header: 'Aksi',
        render: (row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              data-testid={`operasional-item-edit-${row.id}`}
              onClick={() => {
                const matchedType = resource.types.find(
                  (type) => type.id === Number(row.expense_type_id)
                );
                setEditingItem(row);
                setFormValues({
                  categoryId: String(
                    row.expense_category_id ||
                      matchedType?.expense_category_id ||
                      ''
                  ),
                  typeId: String(row.expense_type_id),
                  purchasedOn: row.purchased_on ?? getTodayDateString(),
                  name: row.name,
                  amount: String(row.amount ?? ''),
                  detail: row.detail ?? '',
                });
                setIsFormOpen(isMobileViewport());
              }}
            >
              Ubah
            </Button>
            <Button
              variant="secondary"
              data-testid={`operasional-item-delete-${row.id}`}
              onClick={() =>
                setPendingAction({
                  kind: 'delete',
                  id: row.id,
                  name: row.name,
                })
              }
            >
              Hapus
            </Button>
          </div>
        ),
      },
    ],
    [resource.types]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages);
  const totalAmount = useMemo(
    () => resource.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [resource.items]
  );

  const availableTypes = resource.types.filter(
    (type) =>
      Number(type.expense_category_id) === Number(formValues.categoryId) &&
      Number(type.company_id) === company?.id
  );

  const resetForm = () => {
    setFormValues(emptyFormValues());
    setEditingItem(null);
    setIsFormOpen(false);
  };

  const openCreateForm = () => {
    setFormValues(emptyFormValues());
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const buildMutationValues = (): ItemMutationValues | null => {
    const companyId = company?.id;
    const categoryId = Number(formValues.categoryId);
    const typeId = Number(formValues.typeId);
    const amount = Number(formValues.amount);
    const purchasedOn = formValues.purchasedOn.trim();
    const name = formValues.name.trim();

    if (
      !companyId ||
      !Number.isSafeInteger(categoryId) ||
      categoryId <= 0 ||
      !Number.isSafeInteger(typeId) ||
      typeId <= 0 ||
      !purchasedOn ||
      !name ||
      !formValues.amount.trim() ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      !resource.categories.some((category) => category.id === categoryId) ||
      !resource.types.some(
        (type) =>
          type.id === typeId &&
          Number(type.expense_category_id) === categoryId &&
          Number(type.company_id) === companyId
      )
    ) {
      return null;
    }

    return {
      companyId,
      expenseCategoryId: categoryId,
      expenseTypeId: typeId,
      purchasedOn,
      name,
      amount,
      detail: formValues.detail.trim() || null,
    };
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = buildMutationValues();
    if (!values) return;
    setPendingAction({
      kind: 'save',
      ...(editingItem ? { id: editingItem.id } : {}),
      values,
    });
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);

    if (action.kind === 'save') {
      const input = {
        companyId: action.values.companyId,
        expenseCategoryId: action.values.expenseCategoryId,
        expenseTypeId: action.values.expenseTypeId,
        purchasedOn: action.values.purchasedOn,
        name: action.values.name,
        amount: action.values.amount,
        detail: action.values.detail,
      };
      const saved = action.id
        ? await resource.updateItem(action.id, input)
        : await resource.createItem(input);
      if (saved) resetForm();
    } else if (await resource.removeItem(action.id)) {
      if (editingItem?.id === action.id) resetForm();
    }
  };

  const error = companyResource.error ?? resource.error;

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <div className="flex flex-col gap-5">
      <CardHeader
        eyebrow={`CFO / Input Operasional${company ? ` / ${company.name}` : ''}`}
        title="Item Operasional"
      />

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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-stretch">
            <section
              className="hidden min-w-0 flex-col lg:flex lg:h-[calc(100dvh-12rem)] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-1"
              data-testid="operasional-item-form-section"
            >
              <CardHeader
                title={
                  editingItem
                    ? 'Perbarui Item Operasional'
                    : 'Tambah Item Operasional'
                }
                subtitle="Pilih kategori dan tipe, lalu lengkapi rincian transaksi."
              />
              <ItemOperasionalForm
                editingItem={editingItem}
                formValues={formValues}
                categories={resource.categories}
                availableTypes={availableTypes}
                loading={resource.loading}
                setFormValues={setFormValues}
                onSubmit={submitForm}
                onCancel={resetForm}
              />
            </section>

            <section
              className="min-w-0 lg:flex lg:h-[calc(100dvh-12rem)] lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:overscroll-contain lg:px-1"
              data-testid="operasional-item-list-section"
            >
              <div className="flex items-start justify-between gap-3">
                <CardHeader
                  title="Daftar Item Operasional"
                  subtitle={`${filteredItems.length} data`}
                />
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="primary"
                    className="shrink-0 lg:hidden"
                    onClick={openCreateForm}
                    data-testid="operasional-item-open-form"
                  >
                    Tambah Item
                  </Button>
                </DialogTrigger>
              </div>
              <div className="pb-5">
                <SummaryBanner
                  label="Total Pengeluaran"
                  value={formatCapitalIdr(totalAmount)}
                  testId="operasional-item-total"
                />
              </div>
              {resource.loading && resource.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Memuat data item operasional...
                </p>
              ) : (
                <>
                  <DataTable
                    columns={columns}
                    data={filteredItems.slice(
                      (activePage - 1) * PAGE_SIZE,
                      activePage * PAGE_SIZE
                    )}
                    rowKey={(row) => row.id}
                    stickyHeader
                    searchValue={search}
                    onSearchChange={(value) => {
                      setSearch(value);
                      setPage(1);
                    }}
                    searchLabel="Cari item operasional"
                    searchPlaceholder="Cari nama, tipe, tanggal, atau keterangan..."
                    searchTestId="operasional-item-search"
                    emptyMessage="Belum ada data item operasional."
                    emptyTestId="operasional-item-empty"
                  />
                  <Pagination
                    currentPage={activePage}
                    totalPages={totalPages}
                    totalItems={filteredItems.length}
                    onPageChange={setPage}
                    testId="operasional-item-pagination"
                  />
                </>
              )}
            </section>
          </div>
        </>
      )}

      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto lg:hidden">
        <DialogHeader className="items-start border-0 pb-0">
          <div className="space-y-2">
            <DialogTitle>
              {editingItem
                ? 'Perbarui Item Operasional'
                : 'Tambah Item Operasional'}
            </DialogTitle>
            <DialogDescription>
              Pilih kategori dan tipe, lalu lengkapi rincian transaksi.
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Tutup form item operasional"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        <ItemOperasionalForm
          editingItem={editingItem}
          formValues={formValues}
          categories={resource.categories}
          availableTypes={availableTypes}
          loading={resource.loading}
          setFormValues={setFormValues}
          onSubmit={submitForm}
          onCancel={resetForm}
        />
      </DialogContent>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={
          pendingAction?.kind === 'delete'
            ? 'Konfirmasi Hapus Item'
            : pendingAction?.id
              ? 'Konfirmasi Perubahan Item'
              : 'Konfirmasi Item Baru'
        }
        message={
          pendingAction?.kind === 'delete'
            ? `Hapus item "${pendingAction.name}"?`
            : pendingAction?.kind === 'save'
              ? `${pendingAction.id ? 'Perbarui' : 'Tambahkan'} item "${pendingAction.values.name}" dengan nominal ${formatCapitalIdr(pendingAction.values.amount)}?`
              : ''
        }
        confirmLabel={
          pendingAction?.kind === 'delete'
            ? 'Ya, hapus'
            : pendingAction?.id
              ? 'Ya, perbarui'
              : 'Ya, tambahkan'
        }
        loading={resource.loading}
        testId="operasional-item-confirm"
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
      </div>
    </Dialog>
  );
}
