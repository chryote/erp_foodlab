import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Company,
  DefaultPackage,
  DefaultPackageWizardPayload,
  Ingredient,
  Item,
  ItemPacket,
  PacketCategory,
  PacketName,
  PacketVendor,
} from '@/api/client';
import {
  Badge,
  Button,
  ConfirmDialog,
  DecimalInput,
  SelectInput,
  TextInput,
} from '@/components/ui';
import { formatCapitalIdr } from '@/modules/CFO/CapitalCompanyCrudModal';

interface WizardItemDraft {
  rowId: number;
  item_id: number;
  quantity: string;
  price: string;
}

export interface DefaultPackageWizardPanelProps {
  allPacketNames: PacketName[];
  allPacketCategories: PacketCategory[];
  allPacketVendors: PacketVendor[];
  companies: Company[];
  allItems: Item[];
  allItemPackets: ItemPacket[];
  allIngredients: Ingredient[];
  editingPackage: DefaultPackage | null;
  loading: boolean;
  onCancelEdit: () => void;
  onClearExternalError: () => void;
  onSubmitWizard: (
    payload: DefaultPackageWizardPayload,
    editingId?: number
  ) => Promise<boolean>;
}

function parseOwnerSelection(ownerKey: string): {
  company_id: number | null;
  packet_vendor_id: number | null;
} {
  if (ownerKey.startsWith('company:')) {
    const id = parseInt(ownerKey.slice('company:'.length), 10);
    return {
      company_id: Number.isFinite(id) ? id : null,
      packet_vendor_id: null,
    };
  }
  if (ownerKey.startsWith('vendor:')) {
    const id = parseInt(ownerKey.slice('vendor:'.length), 10);
    return {
      company_id: null,
      packet_vendor_id: Number.isFinite(id) ? id : null,
    };
  }
  return { company_id: null, packet_vendor_id: null };
}

export const DefaultPackageWizardPanel: React.FC<
  DefaultPackageWizardPanelProps
> = ({
  allPacketNames,
  allPacketCategories,
  allPacketVendors,
  companies,
  allItems,
  allItemPackets,
  allIngredients,
  editingPackage,
  loading,
  onCancelEdit,
  onClearExternalError,
  onSubmitWizard,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [packetName, setPacketName] = useState('');
  const [packetCategory, setPacketCategory] = useState('');
  const [brandName, setBrandName] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [rows, setRows] = useState<WizardItemDraft[]>([]);
  const [nextRowId, setNextRowId] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () =>
      document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, []);

  const resetWizard = useCallback(() => {
    setStep(1);
    setPacketName('');
    setPacketCategory('');
    setBrandName('');
    setOwnerKey('');
    setItemSearch('');
    setDropdownOpen(false);
    setRows([]);
    setLocalError(null);
    setConfirmOpen(false);
  }, []);

  useEffect(() => {
    if (!editingPackage) {
      resetWizard();
      return;
    }

    const resolvedPacketName =
      editingPackage.packet_name?.name ??
      allPacketNames.find((p) => p.id === Number(editingPackage.packet_name_id))
        ?.name ??
      '';
    const resolvedCategory =
      editingPackage.packet_category?.name ??
      allPacketCategories.find(
        (c) => c.id === Number(editingPackage.packet_category_id)
      )?.name ??
      '';

    const resolvedOwnerKey =
      editingPackage.company_id != null
        ? `company:${editingPackage.company_id}`
        : editingPackage.packet_vendor_id != null
          ? `vendor:${editingPackage.packet_vendor_id}`
          : '';

    const targetPacketId =
      editingPackage.packet_id ?? editingPackage.item_packet?.packet_id ?? null;

    const packageIngredients = allIngredients.filter(
      (ing) => Number(ing.default_package_id) === Number(editingPackage.id)
    );

    const resolveQty = (itemId: number): string => {
      const matchedIp = allItemPackets.find((ip) => {
        if (Number(ip.item_id) !== itemId) {
          return false;
        }
        if (
          targetPacketId !== null &&
          Number(ip.packet_id) !== Number(targetPacketId)
        ) {
          return false;
        }
        if (editingPackage.company_id != null) {
          return Number(ip.company_id) === Number(editingPackage.company_id);
        }
        if (editingPackage.packet_vendor_id != null) {
          return (
            Number(ip.packet_vendor_id) ===
            Number(editingPackage.packet_vendor_id)
          );
        }
        return true;
      });

      if (matchedIp) {
        return String(matchedIp.quantity ?? 1);
      }
      if (
        editingPackage.item_packet &&
        Number(editingPackage.item_packet.item_id) === itemId
      ) {
        return String(editingPackage.item_packet.quantity ?? 1);
      }
      return '1';
    };

    let hydratedRows: WizardItemDraft[] = [];
    if (packageIngredients.length > 0) {
      hydratedRows = packageIngredients.map((ing, index) => ({
        rowId: index + 1,
        item_id: Number(ing.item_id),
        quantity: resolveQty(Number(ing.item_id)),
        price: String(ing.price ?? 0),
      }));
    } else if (editingPackage.item_packet) {
      hydratedRows = [
        {
          rowId: 1,
          item_id: Number(editingPackage.item_packet.item_id),
          quantity: String(editingPackage.item_packet.quantity ?? 1),
          price: String(editingPackage.price ?? 0),
        },
      ];
    }

    setStep(1);
    setPacketName(resolvedPacketName);
    setPacketCategory(resolvedCategory);
    setBrandName(editingPackage.brand_name);
    setOwnerKey(resolvedOwnerKey);
    setItemSearch('');
    setDropdownOpen(false);
    setRows(hydratedRows);
    setNextRowId(hydratedRows.length + 1);
    setLocalError(null);
    setConfirmOpen(false);
  }, [
    allIngredients,
    allItemPackets,
    allPacketCategories,
    allPacketNames,
    editingPackage,
    resetWizard,
  ]);

  const ownerOptions = useMemo(() => {
    const vendorOpts = allPacketVendors.map((v) => ({
      value: `vendor:${v.id}`,
      label: `${v.name} (Vendor)`,
    }));
    const companyOpts = companies.map((c) => ({
      value: `company:${c.id}`,
      label: `${c.name} (Perusahaan)`,
    }));
    return [...vendorOpts, ...companyOpts];
  }, [allPacketVendors, companies]);

  const selectedOwner = useMemo(() => parseOwnerSelection(ownerKey), [ownerKey]);

  const selectedOwnerLabel = useMemo(
    () => ownerOptions.find((opt) => opt.value === ownerKey)?.label ?? '-',
    [ownerKey, ownerOptions]
  );

  const ownerItems = useMemo<Item[]>(() => {
    if (selectedOwner.company_id !== null) {
      return allItems.filter(
        (item) =>
          item.company_id !== null &&
          Number(item.company_id) === selectedOwner.company_id &&
          item.packet_vendor_id == null
      );
    }
    if (selectedOwner.packet_vendor_id !== null) {
      return allItems.filter(
        (item) =>
          item.packet_vendor_id !== null &&
          Number(item.packet_vendor_id) === selectedOwner.packet_vendor_id &&
          item.company_id == null
      );
    }
    return [];
  }, [allItems, selectedOwner.company_id, selectedOwner.packet_vendor_id]);

  const itemsById = useMemo(() => {
    const map = new Map<number, Item>();
    for (const item of ownerItems) {
      map.set(Number(item.id), item);
    }
    return map;
  }, [ownerItems]);

  const addedItemIds = useMemo(
    () => new Set(rows.map((row) => row.item_id)),
    [rows]
  );

  const selectableSearchItems = useMemo(() => {
    const term = itemSearch.trim().toLowerCase();
    return ownerItems.filter((item) => {
      if (addedItemIds.has(Number(item.id))) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(term) ||
        (item.code ?? '').toLowerCase().includes(term)
      );
    });
  }, [addedItemIds, itemSearch, ownerItems]);

  const totalWizardPrice = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const parsed = parseFloat(row.price);
        return sum + (Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
      }, 0),
    [rows]
  );

  const handleOwnerChange = (nextOwnerKey: string) => {
    setLocalError(null);
    onClearExternalError();
    if (nextOwnerKey !== ownerKey) {
      setOwnerKey(nextOwnerKey);
      setItemSearch('');
      setDropdownOpen(false);
      setRows([]);
    }
  };

  const handleNextFromStep1 = () => {
    setLocalError(null);
    onClearExternalError();

    if (
      !packetName.trim() ||
      !packetCategory.trim() ||
      !brandName.trim() ||
      (selectedOwner.company_id === null &&
        selectedOwner.packet_vendor_id === null)
    ) {
      setLocalError(
        'Nama Paket, Kategori Paket, Nama Brand, dan Vendor Paket wajib diisi.'
      );
      return;
    }

    setStep(2);
  };

  const handleSelectSearchItem = (item: Item) => {
    setLocalError(null);
    onClearExternalError();

    const itemId = Number(item.id);
    if (addedItemIds.has(itemId)) {
      return;
    }

    setRows((prev) => [
      ...prev,
      {
        rowId: nextRowId,
        item_id: itemId,
        quantity: '1',
        price: '0',
      },
    ]);
    setNextRowId((prev) => prev + 1);
    setItemSearch('');
    setDropdownOpen(false);
  };

  const handleUpdateRow = (
    rowId: number,
    patch: Partial<Omit<WizardItemDraft, 'rowId'>>
  ) => {
    setLocalError(null);
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleRemoveRow = (rowId: number) => {
    setLocalError(null);
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const handleNextFromStep2 = () => {
    setLocalError(null);
    onClearExternalError();

    if (rows.length === 0) {
      setLocalError('Pilih minimal 1 item bahan dari Cari Item.');
      return;
    }

    for (const row of rows) {
      const qty = parseInt(row.quantity, 10);
      if (!Number.isFinite(qty) || qty < 1) {
        setLocalError('Quantity setiap item minimal 1.');
        return;
      }
    }

    setDropdownOpen(false);
    setStep(3);
  };

  const buildWizardPayload = (): DefaultPackageWizardPayload | null => {
    if (rows.length === 0) {
      return null;
    }

    const items: DefaultPackageWizardPayload['items'] = [];
    for (const row of rows) {
      const quantity = parseInt(row.quantity, 10);
      const price = row.price ? parseFloat(row.price) : 0;
      if (
        !Number.isFinite(quantity) ||
        quantity < 1 ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        return null;
      }
      items.push({
        item_id: row.item_id,
        quantity,
        price: Math.round(price * 100) / 100,
      });
    }

    return {
      packet_name: packetName.trim(),
      packet_category: packetCategory.trim(),
      brand_name: brandName.trim(),
      ...(selectedOwner.company_id !== null
        ? { company_id: selectedOwner.company_id }
        : { packet_vendor_id: selectedOwner.packet_vendor_id }),
      items,
    };
  };

  const handleOpenSaveConfirm = () => {
    setLocalError(null);
    onClearExternalError();
    const payload = buildWizardPayload();
    if (!payload) {
      setLocalError('Pastikan harga setiap bahan bernilai valid (>= 0).');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    const payload = buildWizardPayload();
    setConfirmOpen(false);
    if (!payload) {
      return;
    }
    const ok = await onSubmitWizard(payload, editingPackage?.id);
    if (ok) {
      if (editingPackage) {
        onCancelEdit();
      }
      resetWizard();
    }
  };

  const isEditing = editingPackage !== null;

  return (
    <div data-testid="paket-awal-wizard" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {isEditing ? 'Edit Paket Awal' : 'Input Paket Awal'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Langkah {step} dari 3 —{' '}
            {step === 1
              ? 'Informasi Paket & Vendor'
              : step === 2
                ? 'Pilih Item & Quantity'
                : 'Input Harga Bahan (Ingredient)'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-xs"
              data-testid="paket-awal-wizard-cancel-edit"
              onClick={() => {
                onClearExternalError();
                onCancelEdit();
                resetWizard();
              }}
            >
              Batal
            </Button>
          )}
          <Badge variant="neutral" data-testid="paket-awal-wizard-step-badge">
            Screen {step}/3
          </Badge>
        </div>
      </div>

      {localError && (
        <div
          role="alert"
          data-testid="paket-awal-wizard-error"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {localError}
        </div>
      )}

      {step === 1 && (
        <div
          data-testid="paket-awal-wizard-step-1"
          className="flex flex-col gap-3"
        >
          <TextInput
            id="paket-awal-wizard-packet_name-input"
            label="Nama Paket"
            labelPlacement="left"
            list="paket-awal-packet-names-list"
            placeholder="Contoh: Paket Hemat"
            value={packetName}
            onChange={(e) => {
              setLocalError(null);
              setPacketName(e.target.value);
            }}
          />
          <datalist id="paket-awal-packet-names-list">
            {allPacketNames.map((pn) => (
              <option key={pn.id} value={pn.name} />
            ))}
          </datalist>

          <TextInput
            id="paket-awal-wizard-packet_category-input"
            label="Kategori Paket"
            labelPlacement="left"
            list="paket-awal-packet-categories-list"
            placeholder="Contoh: Kategori Reguler"
            value={packetCategory}
            onChange={(e) => {
              setLocalError(null);
              setPacketCategory(e.target.value);
            }}
          />
          <datalist id="paket-awal-packet-categories-list">
            {allPacketCategories.map((pc) => (
              <option key={pc.id} value={pc.name} />
            ))}
          </datalist>

          <TextInput
            id="paket-awal-wizard-brand_name-input"
            label="Nama Brand"
            labelPlacement="left"
            placeholder="Contoh: Brand Hemat"
            value={brandName}
            onChange={(e) => {
              setLocalError(null);
              setBrandName(e.target.value);
            }}
          />

          <SelectInput
            id="paket-awal-wizard-owner-input"
            label="Vendor Paket"
            labelPlacement="left"
            placeholder="Pilih vendor atau perusahaan..."
            options={ownerOptions}
            value={ownerKey}
            onChange={(e) => handleOwnerChange(e.target.value)}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              data-testid="paket-awal-wizard-next-1"
              onClick={handleNextFromStep1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div
          data-testid="paket-awal-wizard-step-2"
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Pemilik:{' '}
              <strong className="text-foreground">{selectedOwnerLabel}</strong>
            </span>
            <span>{ownerItems.length} item tersedia</span>
          </div>

          <div ref={searchContainerRef} className="relative">
            <TextInput
              id="paket-awal-wizard-search-input"
              data-testid="paket-awal-wizard-search"
              label="Cari Item"
              labelPlacement="left"
              autoComplete="off"
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls="paket-awal-wizard-search-dropdown"
              placeholder={
                ownerItems.length === 0
                  ? 'Tidak ada item tersedia'
                  : 'Cari dan klik item untuk menambahkan...'
              }
              disabled={ownerItems.length === 0}
              value={itemSearch}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setItemSearch(e.target.value);
                setDropdownOpen(true);
              }}
            />

            {dropdownOpen && ownerItems.length > 0 && (
              <div
                id="paket-awal-wizard-search-dropdown"
                role="listbox"
                data-testid="paket-awal-wizard-search-dropdown"
                className="absolute right-0 z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg sm:w-[calc(100%-152px)]"
              >
                {selectableSearchItems.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {addedItemIds.size >= ownerItems.length
                      ? 'Semua item sudah ditambahkan.'
                      : 'Item tidak ditemukan.'}
                  </div>
                ) : (
                  selectableSearchItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      data-testid={`wizard-search-option-${item.id}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSearchItem(item)}
                      className="flex w-full cursor-pointer items-center justify-between border-b border-border/50 px-3 py-2 text-left text-xs transition-colors last:border-b-0 hover:bg-muted/70"
                    >
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                        {item.code || '-'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/70 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Daftar Item Bahan ({rows.length})
              </span>
            </div>

            {ownerItems.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                Belum ada item terdaftar untuk pemilik yang dipilih.
              </p>
            ) : rows.length === 0 ? (
              <p
                data-testid="paket-awal-wizard-empty-rows"
                className="py-2 text-xs text-muted-foreground"
              >
                Cari dan klik item pada Cari Item di atas untuk menambahkan ke
                Daftar Item Bahan.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {rows.map((row, idx) => {
                  const rowItem = itemsById.get(row.item_id);

                  return (
                    <div
                      key={row.rowId}
                      data-testid={`wizard-item-row-${idx}`}
                      className="grid grid-cols-1 gap-2 rounded-lg border border-border/80 bg-background p-2.5 sm:grid-cols-[minmax(0,1fr)_84px_76px_auto] sm:items-end"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Nama Bahan
                        </span>
                        <div
                          data-testid={`wizard-item-name-${idx}`}
                          className="flex h-9 items-center truncate rounded-lg border border-input bg-muted/40 px-2.5 text-xs font-medium text-foreground"
                        >
                          {rowItem?.name ?? `Item #${row.item_id}`}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Kode
                        </span>
                        <div
                          data-testid={`wizard-item-code-${idx}`}
                          className="flex h-9 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-xs text-foreground"
                        >
                          {rowItem?.code || '-'}
                        </div>
                      </div>

                      <TextInput
                        id={`wizard-item-qty-${idx}`}
                        label="Qty"
                        type="number"
                        min={1}
                        step={1}
                        value={row.quantity}
                        onChange={(e) =>
                          handleUpdateRow(row.rowId, {
                            quantity: e.target.value,
                          })
                        }
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 px-2 text-xs"
                        data-testid={`wizard-remove-row-${idx}`}
                        onClick={() => handleRemoveRow(row.rowId)}
                      >
                        Hapus
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="secondary"
              data-testid="paket-awal-wizard-back-2"
              onClick={() => {
                setLocalError(null);
                setDropdownOpen(false);
                setStep(1);
              }}
            >
              Kembali
            </Button>
            <Button
              type="button"
              data-testid="paket-awal-wizard-next-2"
              disabled={ownerItems.length === 0}
              onClick={handleNextFromStep2}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div
          data-testid="paket-awal-wizard-step-3"
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card/70 p-3 text-xs">
            <div>
              <span className="text-muted-foreground">Nama Brand:</span>{' '}
              <strong className="text-foreground">{brandName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Nama Paket:</span>{' '}
              <strong className="text-foreground">{packetName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Kategori:</span>{' '}
              <strong className="text-foreground">{packetCategory}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Pemilik:</span>{' '}
              <strong className="text-foreground">{selectedOwnerLabel}</strong>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/70 p-3">
            {rows.map((row, idx) => {
              const matchedItem = itemsById.get(row.item_id);
              return (
                <div
                  key={row.rowId}
                  data-testid={`wizard-price-row-${idx}`}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-border/80 bg-background p-2.5 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center"
                >
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">
                      {matchedItem?.name ?? `Item #${row.item_id}`}
                    </div>
                    <div className="text-muted-foreground">
                      Kode: {matchedItem?.code || '-'} • Qty: {row.quantity}
                    </div>
                  </div>
                  <DecimalInput
                    id={`wizard-price-input-${idx}`}
                    data-testid={`wizard-price-input-${idx}`}
                    label="Harga (Rp)"
                    value={row.price}
                    onChange={(rawValue) =>
                      handleUpdateRow(row.rowId, { price: rawValue })
                    }
                  />
                </div>
              );
            })}

            <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
              <span className="font-medium text-muted-foreground">
                Total Harga Paket Awal
              </span>
              <strong
                data-testid="paket-awal-wizard-total-price"
                className="text-sm text-foreground"
              >
                {formatCapitalIdr(totalWizardPrice)}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="secondary"
              data-testid="paket-awal-wizard-back-3"
              onClick={() => {
                setLocalError(null);
                setStep(2);
              }}
            >
              Kembali
            </Button>
            <Button
              type="button"
              disabled={loading}
              data-testid="paket-awal-wizard-save"
              onClick={handleOpenSaveConfirm}
            >
              {loading
                ? 'Menyimpan...'
                : isEditing
                  ? 'Perbarui'
                  : 'Simpan'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title={
          isEditing
            ? 'Konfirmasi Perbarui Paket Awal'
            : 'Konfirmasi Simpan Paket Awal'
        }
        message={
          isEditing
            ? `Perbarui paket awal "${brandName.trim()}" beserta ${rows.length} item dan harga bahan?`
            : `Simpan paket awal "${brandName.trim()}" beserta ${rows.length} item dan harga bahan ke database?`
        }
        confirmLabel={isEditing ? 'Ya, Perbarui' : 'Ya, Simpan'}
        cancelLabel="Batal"
        loading={loading}
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
