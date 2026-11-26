import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  DefaultPackage,
  Ingredient,
  IngredientPayload,
  Item,
} from '@/api/client';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  DecimalInput,
  Modal,
  Pagination,
  SelectInput,
} from '@/components/ui';
import { useIngredientCrudResource } from '@/lib/cpoResources';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  type GroupedIngredientRow,
  formatDefaultPackageLabel,
  formatIngredientOptionLabel,
  formatItemLabel,
  groupIngredientsByPackage,
} from './ingredientGrouping';

interface IngredientRowDraft {
  rowId: number;
  ingredientId?: number;
  item_id: string;
  price: string;
}

type PendingIngredientAction =
  | {
      type: 'create';
      defaultPackageId: number;
      rows: Array<{ item_id: number; price: number }>;
    }
  | {
      type: 'update';
      defaultPackageId: number;
      originalIngredients: Ingredient[];
      rows: Array<{ ingredientId?: number; item_id: number; price: number }>;
    }
  | {
      type: 'delete';
      group: GroupedIngredientRow;
    };

export interface MasterBahanBakuCrudModalProps {
  isOpen: boolean;
  companies?: Company[];
  onClose: () => void;
}

export const MasterBahanBakuCrudModal: React.FC<
  MasterBahanBakuCrudModalProps
> = ({ isOpen, companies, onClose }) => {
  const {
    allIngredients,
    allDefaultPackages,
    allItems,
    loading,
    error,
    clearError,
    createIngredient,
    updateIngredient,
    removeIngredient,
  } = useIngredientCrudResource(isOpen);

  const [defaultPackageId, setDefaultPackageId] = useState('');
  const [rows, setRows] = useState<IngredientRowDraft[]>([
    { rowId: 1, item_id: '', price: '0' },
  ]);
  const [nextRowId, setNextRowId] = useState(2);
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingIngredientAction | null>(null);

  const pageSize = 10;

  const resetForm = () => {
    setDefaultPackageId('');
    setEditingPackageId(null);
    setRows([{ rowId: nextRowId, item_id: '', price: '0' }]);
    setNextRowId((prev) => prev + 1);
    setLocalError(null);
  };

  useEffect(() => {
    if (!isOpen) {
      setDefaultPackageId('');
      setEditingPackageId(null);
      setRows([{ rowId: 1, item_id: '', price: '0' }]);
      setNextRowId(2);
      setCurrentPage(1);
      setLocalError(null);
      setPendingAction(null);
      clearError();
    }
  }, [isOpen, clearError]);

  const defaultPackagesById = useMemo(() => {
    const map = new Map<number, DefaultPackage>();
    for (const dp of allDefaultPackages) {
      map.set(Number(dp.id), dp);
    }
    return map;
  }, [allDefaultPackages]);

  const companiesById = useMemo(() => {
    const map = new Map<number, Company>();
    for (const company of companies ?? []) {
      map.set(Number(company.id), company);
    }
    return map;
  }, [companies]);

  const itemsById = useMemo(() => {
    const map = new Map<number, Item>();
    for (const item of allItems) {
      map.set(Number(item.id), item);
    }
    return map;
  }, [allItems]);

  const groupedIngredients = useMemo<GroupedIngredientRow[]>(
    () => groupIngredientsByPackage(allIngredients, defaultPackagesById),
    [allIngredients, defaultPackagesById]
  );

  const bahanItems = useMemo<Item[]>(
    () =>
      allItems.filter(
        (item) => item.type === 'Bahan' || item.type === 'Kelengkapan'
      ),
    [allItems]
  );

  // In create mode, exclude items already saved on the selected brand so the user
  // doesn't hit duplicate-item validation errors; in edit mode, all company Bahan items remain available.
  const persistedItemIdsForSelectedBrand = useMemo(() => {
    if (editingPackageId !== null || !defaultPackageId) {
      return new Set<string>();
    }
    return new Set(
      allIngredients
        .filter((ing) => String(ing.default_package_id) === defaultPackageId)
        .map((ing) => String(ing.item_id))
    );
  }, [allIngredients, defaultPackageId, editingPackageId]);

  const availableBahanCount = useMemo(
    () =>
      bahanItems.filter(
        (item) => !persistedItemIdsForSelectedBrand.has(String(item.id))
      ).length,
    [bahanItems, persistedItemIdsForSelectedBrand]
  );

  const defaultPackageOptions = useMemo(
    () =>
      allDefaultPackages.map((dp) => ({
        value: String(dp.id),
        label: formatDefaultPackageLabel(dp),
      })),
    [allDefaultPackages]
  );

  const handleBrandChange = (nextDefaultPackageId: string) => {
    setLocalError(null);
    clearError();
    setDefaultPackageId(nextDefaultPackageId);

    const persistedForNextBrand = new Set(
      editingPackageId === null && nextDefaultPackageId
        ? allIngredients
            .filter(
              (ing) => String(ing.default_package_id) === nextDefaultPackageId
            )
            .map((ing) => String(ing.item_id))
        : []
    );
    const validItemIds = new Set(
      bahanItems
        .filter((item) => !persistedForNextBrand.has(String(item.id)))
        .map((item) => String(item.id))
    );

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        item_id: validItemIds.has(row.item_id) ? row.item_id : '',
      }))
    );
  };

  const handleAddRow = () => {
    setLocalError(null);
    setRows((prev) => [...prev, { rowId: nextRowId, item_id: '', price: '0' }]);
    setNextRowId((prev) => prev + 1);
  };

  const handleUpdateRow = (
    rowId: number,
    patch: Partial<Omit<IngredientRowDraft, 'rowId'>>
  ) => {
    setLocalError(null);
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleRemoveRow = (rowId: number) => {
    setLocalError(null);
    setRows((prev) =>
      prev.length > 1 ? prev.filter((row) => row.rowId !== rowId) : prev
    );
  };

  const handleStartEdit = (group: GroupedIngredientRow) => {
    setLocalError(null);
    clearError();
    setEditingPackageId(group.default_package_id);
    setDefaultPackageId(String(group.default_package_id));

    let currentId = nextRowId;
    const mappedRows: IngredientRowDraft[] = group.ingredients.map((ing) => ({
      rowId: currentId++,
      ingredientId: ing.id,
      item_id: String(ing.item_id),
      price: String(ing.price ?? 0),
    }));
    setRows(
      mappedRows.length > 0
        ? mappedRows
        : [{ rowId: currentId++, item_id: '', price: '0' }]
    );
    setNextRowId(currentId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const parsedDpId = parseInt(defaultPackageId, 10);
    if (!Number.isFinite(parsedDpId) || parsedDpId <= 0) {
      setLocalError('Pilih Nama Brand terlebih dahulu.');
      return;
    }

    const parsedRows: Array<{
      ingredientId?: number;
      item_id: number;
      price: number;
    }> = [];
    const seenItemIds = new Set<number>();

    for (const row of rows) {
      const parsedItemId = parseInt(row.item_id, 10);
      const parsedPrice = row.price ? parseFloat(row.price) : 0;

      if (!Number.isFinite(parsedItemId) || parsedItemId <= 0) {
        setLocalError('Semua baris Bahan Baku wajib dipilih.');
        return;
      }
      if (seenItemIds.has(parsedItemId)) {
        setLocalError('Bahan Baku tidak boleh duplikat dalam satu pengisian.');
        return;
      }
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setLocalError('Harga bahan baku harus berupa angka >= 0.');
        return;
      }

      seenItemIds.add(parsedItemId);
      parsedRows.push({
        ingredientId: row.ingredientId,
        item_id: parsedItemId,
        price: Math.round(parsedPrice * 100) / 100,
      });
    }

    if (editingPackageId !== null) {
      const originalGroup = groupedIngredients.find(
        (g) => g.default_package_id === editingPackageId
      );
      setPendingAction({
        type: 'update',
        defaultPackageId: parsedDpId,
        originalIngredients: originalGroup?.ingredients ?? [],
        rows: parsedRows,
      });
    } else {
      setPendingAction({
        type: 'create',
        defaultPackageId: parsedDpId,
        rows: parsedRows.map(({ item_id, price }) => ({ item_id, price })),
      });
    }
  };

  const syncEditedGroup = async (
    targetDefaultPackageId: number,
    originalIngredients: Ingredient[],
    targetRows: Array<{ ingredientId?: number; item_id: number; price: number }>
  ): Promise<boolean> => {
    const keptExistingIds = new Set(
      targetRows
        .map((r) => r.ingredientId)
        .filter((id): id is number => id !== undefined)
    );
    const originalById = new Map(
      originalIngredients.map((ing) => [ing.id, ing])
    );

    // 1. Delete rows removed in the UI first to free (default_package_id, item_id) pairs.
    for (const orig of originalIngredients) {
      if (!keptExistingIds.has(orig.id)) {
        const deleted = await removeIngredient(orig.id);
        if (!deleted) {
          return false;
        }
      }
    }

    // 2. Identify existing rows whose item_id changed and would collide with another
    //    kept row's original item_id (e.g. swapped items); delete them first so updates never collide.
    const activeOriginalItems = new Map<number, number>();
    for (const orig of originalIngredients) {
      if (keptExistingIds.has(orig.id)) {
        activeOriginalItems.set(orig.id, Number(orig.item_id));
      }
    }

    const rowsToReCreate: Array<{ item_id: number; price: number }> = [];
    const rowsToUpdate: Array<{
      id: number;
      payload: IngredientPayload;
    }> = [];

    for (const row of targetRows) {
      if (row.ingredientId === undefined) {
        rowsToReCreate.push({ item_id: row.item_id, price: row.price });
        continue;
      }
      const orig = originalById.get(row.ingredientId);
      if (!orig) {
        rowsToReCreate.push({ item_id: row.item_id, price: row.price });
        continue;
      }
      const sameDp =
        Number(orig.default_package_id) === targetDefaultPackageId;
      const sameItem = Number(orig.item_id) === row.item_id;
      const samePrice =
        Math.round((Number(orig.price) || 0) * 100) ===
        Math.round(row.price * 100);

      if (sameDp && sameItem && samePrice) {
        continue;
      }

      const collidesWithAnotherKeptOriginal =
        !sameItem &&
        Array.from(activeOriginalItems.entries()).some(
          ([otherId, otherItemId]) =>
            otherId !== row.ingredientId && otherItemId === row.item_id
        );

      if (collidesWithAnotherKeptOriginal) {
        const deleted = await removeIngredient(row.ingredientId);
        if (!deleted) {
          return false;
        }
        activeOriginalItems.delete(row.ingredientId);
        rowsToReCreate.push({ item_id: row.item_id, price: row.price });
      } else {
        rowsToUpdate.push({
          id: row.ingredientId,
          payload: {
            default_package_id: targetDefaultPackageId,
            item_id: row.item_id,
            price: row.price,
          },
        });
      }
    }

    for (const item of rowsToUpdate) {
      const updated = await updateIngredient(item.id, item.payload);
      if (!updated) {
        return false;
      }
    }

    for (const item of rowsToReCreate) {
      const created = await createIngredient({
        default_package_id: targetDefaultPackageId,
        item_id: item.item_id,
        price: item.price,
      });
      if (!created) {
        return false;
      }
    }

    return true;
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction) {
      return;
    }
    const action = pendingAction;
    setPendingAction(null);

    if (action.type === 'create') {
      for (const row of action.rows) {
        const created = await createIngredient({
          default_package_id: action.defaultPackageId,
          item_id: row.item_id,
          price: row.price,
        });
        if (!created) {
          return;
        }
      }
      resetForm();
      setCurrentPage(1);
    } else if (action.type === 'update') {
      const ok = await syncEditedGroup(
        action.defaultPackageId,
        action.originalIngredients,
        action.rows
      );
      if (ok) {
        resetForm();
      }
    } else {
      for (const ing of action.group.ingredients) {
        const removed = await removeIngredient(ing.id);
        if (!removed) {
          return;
        }
      }
      if (editingPackageId === action.group.default_package_id) {
        resetForm();
      }
    }
  };

  const confirmDialogConfig = useMemo(() => {
    if (!pendingAction) {
      return { title: '', message: '' };
    }
    if (pendingAction.type === 'create') {
      return {
        title: 'Konfirmasi Tambah Data',
        message:
          pendingAction.rows.length > 1
            ? `Apakah Anda yakin ingin menambahkan ${pendingAction.rows.length} item bahan baku ini?`
            : 'Apakah Anda yakin ingin menambahkan data ini?',
      };
    }
    if (pendingAction.type === 'update') {
      return {
        title: 'Konfirmasi Perbarui Data',
        message: 'Apakah Anda yakin ingin memperbarui daftar bahan baku ini?',
      };
    }
    return {
      title: 'Konfirmasi Hapus Data',
      message:
        'Apakah Anda yakin ingin menghapus semua bahan baku untuk Nama Brand ini?',
    };
  }, [pendingAction]);

  const totalPages = Math.max(
    1,
    Math.ceil(groupedIngredients.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedGroups = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return groupedIngredients.slice(start, start + pageSize);
  }, [groupedIngredients, safeCurrentPage]);

  const columns: DataTableColumn<GroupedIngredientRow>[] = [
    {
      key: 'no',
      header: 'No',
      render: (_row, index) => (
        <code>{(safeCurrentPage - 1) * pageSize + index + 1}</code>
      ),
    },
    {
      key: 'default_package_id',
      header: 'Nama Brand',
      render: (row) => {
        const matched =
          defaultPackagesById.get(row.default_package_id) ??
          row.default_package;
        return matched
          ? formatDefaultPackageLabel(matched)
          : String(row.default_package_id);
      },
    },
    {
      key: 'ingredients',
      header: 'Bahan Baku',
      render: (row) =>
        row.ingredients
          .map((ing) => {
            const matched =
              itemsById.get(Number(ing.item_id)) ?? ing.item;
            return matched ? formatItemLabel(matched) : String(ing.item_id);
          })
          .join(', '),
    },
    {
      key: 'total_price',
      header: 'Harga (Rp)',
      render: (row) => formatCapitalIdr(row.total_price),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div
          className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap"
          data-testid={`actions-row-${row.id}`}
        >
          <Button
            variant="secondary"
            className="h-7 px-2.5 py-1 text-xs"
            data-testid={`edit-row-${row.id}`}
            onClick={() => handleStartEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="h-7 px-2.5 py-1 text-xs"
            data-testid={`delete-row-${row.id}`}
            onClick={() => setPendingAction({ type: 'delete', group: row })}
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  const displayedError = localError ?? error;
  const isEditing = editingPackageId !== null;
  const maxAddableRows = isEditing ? bahanItems.length : availableBahanCount;

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="Master Bahan Baku"
        subtitle="Kelola bahan baku (Ingredient) berdasarkan Nama Brand paket awal"
        testId="master-bahan-baku-crud-modal"
        maxWidthClass="max-w-[95vw]"
        dialogClassName="h-[92vh] max-h-[92vh]"
        bodyClassName="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden"
        onClose={onClose}
      >
        {displayedError && (
          <div
            role="alert"
            className="shrink-0 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm text-primary"
          >
            {displayedError}
          </div>
        )}

        <div
          data-testid="master-bahan-baku-crud-modal-split-layout"
          className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]"
        >
          <div
            data-testid="master-bahan-baku-crud-modal-form-panel"
            className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/25 p-4 lg:overflow-y-auto"
          >
            <form
              onSubmit={handleSubmit}
              data-testid="master-bahan-baku-crud-modal-form"
              className="flex flex-col gap-4"
            >
              <div className="border-b border-border pb-2.5">
                <h3 className="text-sm font-semibold text-foreground">
                  {isEditing ? 'Edit Data' : 'Tambah Data'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isEditing
                    ? 'Perbarui, hapus, atau tambahkan item bahan baku untuk Nama Brand ini.'
                    : 'Pilih Nama Brand dan tambahkan item Bahan Baku.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <SelectInput
                  id="master-bahan-baku-crud-modal-default_package_id-input"
                  label="Nama Brand"
                  labelPlacement="left"
                  placeholder="Pilih nama brand..."
                  disabled={isEditing}
                  options={defaultPackageOptions}
                  value={defaultPackageId}
                  onChange={(e) => handleBrandChange(e.target.value)}
                />
              </div>

              <div
                data-testid="ingredient-items-section"
                className="flex flex-col gap-3 rounded-xl border border-border bg-card/70 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Bahan Baku
                    </h4>
                    <Badge variant="neutral">{rows.length} item</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    title="Tambah Item"
                    data-testid="add-ingredient-row-btn"
                    className="h-7 px-2.5 text-sm font-bold"
                    disabled={
                      !defaultPackageId ||
                      maxAddableRows === 0 ||
                      rows.length >= maxAddableRows
                    }
                    onClick={handleAddRow}
                  >
                    +
                  </Button>
                </div>

                {defaultPackageId && bahanItems.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                    Silakan tambahkan item bertipe "Bahan" atau "Kelengkapan"
                    terlebih dahulu.
                  </p>
                )}

                {!isEditing &&
                  defaultPackageId &&
                  bahanItems.length > 0 &&
                  availableBahanCount === 0 && (
                    <p className="rounded-lg border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                      Semua item Bahan dan Kelengkapan untuk paket ini sudah
                      terdaftar. Klik Edit pada tabel untuk mengubah atau
                      menambah harga.
                    </p>
                  )}

                <div
                  className="flex flex-col gap-2.5"
                  data-testid="ingredient-items-list"
                >
                  {rows.map((row, index) => {
                    const selectedByOtherRows = new Set(
                      rows
                        .filter((other) => other.rowId !== row.rowId)
                        .map((other) => other.item_id)
                        .filter(Boolean)
                    );
                    const rowItemOptions = bahanItems
                      .filter(
                        (item) =>
                          String(item.id) === row.item_id ||
                          (!selectedByOtherRows.has(String(item.id)) &&
                            !persistedItemIdsForSelectedBrand.has(
                              String(item.id)
                            ))
                      )
                      .map((item) => ({
                        value: String(item.id),
                        label: formatIngredientOptionLabel(item, companiesById),
                      }));

                    return (
                      <div
                        key={row.rowId}
                        data-testid={`ingredient-item-row-${index}`}
                        className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3"
                      >
                        <SelectInput
                          id={`master-bahan-baku-item_id-input-${row.rowId}`}
                          label="Bahan Baku"
                          labelPlacement="left"
                          placeholder={
                            defaultPackageId
                              ? 'Pilih bahan baku...'
                              : 'Pilih Nama Brand dulu...'
                          }
                          disabled={
                            !defaultPackageId ||
                            (rowItemOptions.length === 0 && !row.item_id)
                          }
                          options={rowItemOptions}
                          value={row.item_id}
                          onChange={(e) =>
                            handleUpdateRow(row.rowId, {
                              item_id: e.target.value,
                            })
                          }
                        />
                        <DecimalInput
                          id={`master-bahan-baku-price-input-${row.rowId}`}
                          label="Harga (Rp)"
                          labelPlacement="left"
                          placeholder="Contoh: 15.000"
                          value={row.price}
                          onChange={(rawVal) =>
                            handleUpdateRow(row.rowId, { price: rawVal })
                          }
                        />
                        {rows.length > 1 && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-7 px-2.5 py-1 text-xs"
                              data-testid={`remove-ingredient-row-${index}`}
                              onClick={() => handleRemoveRow(row.rowId)}
                            >
                              Hapus Baris
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button type="submit" variant="primary" disabled={loading}>
                  {isEditing ? 'Perbarui' : 'Tambah'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div
            data-testid="master-bahan-baku-crud-modal-table-panel"
            className="flex min-h-0 min-w-0 flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
              <DataTable
                columns={columns}
                data={paginatedGroups}
                rowKey={(row) => row.id}
                emptyMessage="Belum ada data bahan baku."
              />
            </div>

            <div className="shrink-0 border-t border-border pt-3">
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={groupedIngredients.length}
                testId="master-bahan-baku-crud-modal-pagination"
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isOpen && pendingAction !== null}
        title={confirmDialogConfig.title}
        message={confirmDialogConfig.message}
        loading={loading}
        onConfirm={handleConfirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
};
