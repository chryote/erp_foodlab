import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, type ButtonVariant } from './Button';
import { DataTable, type DataTableColumn } from './DataTable';
import { Pagination } from './Pagination';
import { ShadcnInput } from './shadcn/input';
import { ShadcnLabel } from './shadcn/label';

export interface ModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  testId?: string;
  maxWidthClass?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  subtitle,
  testId = 'ui-modal',
  maxWidthClass = 'max-w-3xl',
  onClose,
  children,
  footer,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-6 backdrop-blur-xs"
      data-testid={`${testId}-backdrop`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className={cn(
          'flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl',
          maxWidthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Button
            variant="secondary"
            aria-label="Tutup Modal"
            onClick={onClose}
          >
            Tutup
          </Button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-2.5 border-t border-border px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  id,
  className,
  ...rest
}) => {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {label && <ShadcnLabel htmlFor={id}>{label}</ShadcnLabel>}
      <ShadcnInput id={id} className={className} {...rest} />
    </div>
  );
};

export interface DecimalInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
  > {
  label?: string;
  value: string;
  onChange: (rawValue: string) => void;
}

export function formatDecimalInputDisplay(raw: string): string {
  if (!raw) {
    return '';
  }
  const normalized = raw.trim().replace(/,/g, '.');
  const [intPart = '', fracPart] = normalized.split('.');
  const digitsOnlyInt = intPart.replace(/\D/g, '');
  if (!digitsOnlyInt && fracPart === undefined) {
    return '';
  }
  const formattedInt = (digitsOnlyInt || '0').replace(
    /\B(?=(\d{3})+(?!\d))/g,
    '.'
  );
  if (fracPart !== undefined) {
    const cleanFrac = fracPart.replace(/\D/g, '');
    return `${formattedInt},${cleanFrac}`;
  }
  return formattedInt;
}

export function parseDecimalInputRaw(displayValue: string): string {
  if (!displayValue) {
    return '';
  }
  const trimmed = displayValue.trim();

  if (trimmed.includes(',')) {
    const [intSide = '', ...fracParts] = trimmed.split(',');
    const cleanInt = intSide.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    const cleanFrac = fracParts.join('').replace(/\D/g, '');
    return `${cleanInt || '0'}.${cleanFrac}`;
  }

  const dotParts = trimmed.split('.');
  if (dotParts.length === 2) {
    const [left = '', right = ''] = dotParts;
    if (left.length > 3 && right.length > 0 && right.length <= 2) {
      const cleanLeft = left.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      const cleanRight = right.replace(/\D/g, '');
      return `${cleanLeft || '0'}.${cleanRight}`;
    }
  }

  return trimmed.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export const DecimalInput: React.FC<DecimalInputProps> = ({
  label,
  id,
  value,
  onChange,
  className,
  ...rest
}) => {
  const displayValue = useMemo(() => formatDecimalInputDisplay(value), [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextRaw = parseDecimalInputRaw(e.target.value);
    onChange(nextRaw);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {label && <ShadcnLabel htmlFor={id}>{label}</ShadcnLabel>}
      <ShadcnInput
        id={id}
        type="text"
        inputMode="decimal"
        className={className}
        value={displayValue}
        onChange={handleChange}
        {...rest}
      />
    </div>
  );
};

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  id,
  placeholder = 'Pilih opsi...',
  options,
  className,
  ...rest
}) => {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {label && <ShadcnLabel htmlFor={id}>{label}</ShadcnLabel>}
      <select
        id={id}
        className={cn(
          'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export interface SummaryBannerProps {
  label: string;
  value: React.ReactNode;
  testId?: string;
}

export const SummaryBanner: React.FC<SummaryBannerProps> = ({
  label,
  value,
  testId = 'ui-summary-banner',
}) => {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3"
      data-testid={testId}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <strong
        className="text-base font-bold text-emerald-700"
        data-testid={`${testId}-value`}
      >
        {value}
      </strong>
    </div>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  testId?: string;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  confirmVariant = 'primary',
  testId = 'confirm-dialog',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/45 p-6 backdrop-blur-xs"
      data-testid={`${testId}-backdrop`}
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
        </div>

        <div className="px-6 py-4 text-sm text-muted-foreground">
          {message}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-border px-6 py-3.5">
          <Button
            type="button"
            variant="secondary"
            data-testid={`${testId}-cancel`}
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            data-testid={`${testId}-confirm`}
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export interface CrudEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export interface NamedCrudEntity extends CrudEntity {
  name: string;
}

export interface CrudFieldConfig<T> {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: 'text' | 'number' | 'decimal' | 'select' | 'date';
  optional?: boolean;
  step?: string | number;
  min?: string | number;
  options?:
    | SelectOption[]
    | ((values: Record<string, string>) => SelectOption[]);
  disabled?: boolean | ((values: Record<string, string>) => boolean);
  resetFieldsOnChange?: (keyof T & string)[];
  renderValue?: (row: T) => React.ReactNode;
  filterText?: (row: T) => string;
}

export interface CrudComputedColumnConfig<T> {
  key: string;
  label: string;
  render: (row: T, index: number) => React.ReactNode;
  filterText?: (row: T) => string;
}

export interface CrudRowActionConfig<T> {
  key: string;
  label: string;
  variant?: ButtonVariant;
  testId?: (row: T) => string;
  requireConfirm?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  onClick: (row: T) => void;
}

type PendingCrudAction<T> =
  | { type: 'create'; values: Record<string, string> }
  | { type: 'update'; id: number; values: Record<string, string> }
  | { type: 'delete'; id: number }
  | {
      type: 'rowAction';
      action: CrudRowActionConfig<T>;
      row: T;
    };

export interface CrudModalProps<T extends CrudEntity> {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  testId?: string;
  tabs?: React.ReactNode;
  resetKey?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  fields?: CrudFieldConfig<T>[];
  computedColumns?: CrudComputedColumnConfig<T>[];
  rowActions?: CrudRowActionConfig<T>[];
  summary?: React.ReactNode;
  emptyMessage?: string;
  pageSize?: number;
  items: T[];
  loading?: boolean;
  error?: string | null;
  readOnly?: boolean;
  onClose: () => void;
  onCreate?: (values: Record<string, string>) => Promise<void> | void;
  onUpdate?: (
    id: number,
    values: Record<string, string>
  ) => Promise<void> | void;
  onDelete?: (id: number) => Promise<void> | void;
}

export function CrudModal<T extends CrudEntity>({
  isOpen,
  title,
  subtitle,
  testId = 'crud-modal',
  tabs,
  resetKey,
  inputLabel = 'Nama',
  inputPlaceholder = 'Masukkan nama...',
  fields,
  computedColumns = [],
  rowActions = [],
  summary,
  emptyMessage = 'Belum ada data.',
  pageSize = 5,
  items,
  loading = false,
  error = null,
  readOnly = false,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: CrudModalProps<T>): React.ReactElement | null {
  const resolvedFields = useMemo<CrudFieldConfig<T>[]>(() => {
    if (fields && fields.length > 0) {
      return fields;
    }
    return [
      {
        key: 'name' as keyof T & string,
        label: inputLabel,
        placeholder: inputPlaceholder,
      },
    ];
  }, [fields, inputLabel, inputPlaceholder]);

  const createEmptyFormValues = () => {
    const initial: Record<string, string> = {};
    for (const f of resolvedFields) {
      initial[f.key] = f.defaultValue ?? '';
    }
    return initial;
  };

  const [formValues, setFormValues] = useState<Record<string, string>>(
    createEmptyFormValues
  );
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingAction, setPendingAction] =
    useState<PendingCrudAction<T> | null>(null);

  useEffect(() => {
    setFormValues(createEmptyFormValues());
    setEditingItem(null);
    setCurrentPage(1);
    setPendingAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safeCurrentPage, pageSize]);

  const handleFieldChange = (key: string, value: string) => {
    const fieldConfig = resolvedFields.find((f) => f.key === key);
    setFormValues((prev) => {
      if (prev[key] === value) {
        return prev;
      }
      const next: Record<string, string> = {
        ...prev,
        [key]: value,
      };
      if (fieldConfig?.resetFieldsOnChange) {
        for (const targetKey of fieldConfig.resetFieldsOnChange) {
          next[targetKey] = '';
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      return;
    }
    const trimmedValues: Record<string, string> = {};
    for (const field of resolvedFields) {
      const val = (formValues[field.key] ?? '').trim();
      if (!val && !field.optional) {
        return;
      }
      trimmedValues[field.key] = val;
    }

    if (editingItem) {
      setPendingAction({
        type: 'update',
        id: editingItem.id,
        values: trimmedValues,
      });
    } else {
      setPendingAction({
        type: 'create',
        values: trimmedValues,
      });
    }
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction) {
      return;
    }
    const currentAction = pendingAction;
    setPendingAction(null);

    if (currentAction.type === 'create') {
      await onCreate?.(currentAction.values);
      setFormValues(createEmptyFormValues());
      setCurrentPage(1);
    } else if (currentAction.type === 'update') {
      await onUpdate?.(currentAction.id, currentAction.values);
      setEditingItem(null);
      setFormValues(createEmptyFormValues());
    } else if (currentAction.type === 'delete') {
      await onDelete?.(currentAction.id);
      if (editingItem?.id === currentAction.id) {
        setEditingItem(null);
        setFormValues(createEmptyFormValues());
      }
    } else if (currentAction.type === 'rowAction') {
      currentAction.action.onClick(currentAction.row);
    }
  };

  const confirmDialogConfig = useMemo(() => {
    if (!pendingAction) {
      return { title: '', message: '' };
    }
    if (pendingAction.type === 'create') {
      return {
        title: 'Konfirmasi Tambah Data',
        message: 'Apakah Anda yakin ingin menambahkan data ini?',
      };
    }
    if (pendingAction.type === 'update') {
      return {
        title: 'Konfirmasi Perbarui Data',
        message: 'Apakah Anda yakin ingin memperbarui data ini?',
      };
    }
    if (pendingAction.type === 'delete') {
      return {
        title: 'Konfirmasi Hapus Data',
        message: 'Apakah Anda yakin ingin menghapus data ini?',
      };
    }
    return {
      title:
        pendingAction.action.confirmTitle ??
        `Konfirmasi ${pendingAction.action.label}`,
      message:
        pendingAction.action.confirmMessage ??
        `Apakah Anda yakin ingin menjalankan aksi "${pendingAction.action.label}"?`,
    };
  }, [pendingAction]);

  const handleStartEdit = (item: T) => {
    setEditingItem(item);
    const nextValues: Record<string, string> = {};
    for (const field of resolvedFields) {
      const raw = item[field.key];
      if (raw !== null && raw !== undefined) {
        const stringified = String(raw);
        nextValues[field.key] =
          field.type === 'date' ? stringified.slice(0, 10) : stringified;
      } else {
        nextValues[field.key] = field.defaultValue ?? '';
      }
    }
    setFormValues(nextValues);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormValues(createEmptyFormValues());
  };

  const columns: DataTableColumn<T>[] = [
    {
      key: 'no',
      header: 'No',
      render: (_row, index) => (
        <code>{(safeCurrentPage - 1) * pageSize + index + 1}</code>
      ),
    },
    ...resolvedFields.map((field) => ({
      key: field.key,
      header: field.label,
      render: (row: T) => {
        if (field.renderValue) {
          return field.renderValue(row);
        }
        const raw = row[field.key];
        if (field.type === 'select' && field.options) {
          const resolvedOptions =
            typeof field.options === 'function'
              ? field.options({})
              : field.options;
          const match = resolvedOptions.find(
            (opt) => opt.value === String(raw ?? '')
          );
          if (match) {
            return match.label;
          }
        }
        return String(raw ?? '');
      },
    })),
    ...computedColumns.map((col) => ({
      key: col.key,
      header: col.label,
      render: (row: T, index: number) => col.render(row, index),
    })),
    ...(!readOnly || rowActions.length > 0
      ? [
          {
            key: 'actions',
            header: 'Aksi',
            render: (row: T) => (
              <div
                className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap"
                data-testid={`actions-row-${row.id}`}
              >
                {rowActions.map((action) => (
                  <Button
                    key={action.key}
                    variant={action.variant ?? 'secondary'}
                    className="whitespace-nowrap"
                    data-testid={
                      action.testId
                        ? action.testId(row)
                        : `action-${action.key}-row-${row.id}`
                    }
                    onClick={() => {
                      if (action.requireConfirm) {
                        setPendingAction({ type: 'rowAction', action, row });
                      } else {
                        action.onClick(row);
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
                {!readOnly && (
                  <>
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
                      onClick={() =>
                        setPendingAction({ type: 'delete', id: row.id })
                      }
                    >
                      Hapus
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const isMultiRowForm = resolvedFields.length > 4;

  return (
    <>
      <Modal
        isOpen={isOpen}
        title={title}
        subtitle={subtitle}
        testId={testId}
        maxWidthClass={isMultiRowForm ? 'max-w-5xl' : 'max-w-3xl'}
        onClose={onClose}
      >
        {tabs}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!readOnly && (
          <form
            onSubmit={handleSubmit}
            data-testid={`${testId}-form`}
            className={
              isMultiRowForm
                ? 'grid grid-cols-1 items-end gap-3 border-b border-border pb-4 sm:grid-cols-2 md:grid-cols-4'
                : 'flex flex-wrap items-end gap-2.5 border-b border-border pb-4'
            }
          >
            {resolvedFields.map((field) => {
              const isFieldDisabled =
                typeof field.disabled === 'function'
                  ? field.disabled(formValues)
                  : field.disabled;
              if (field.type === 'select') {
                const resolvedOptions =
                  typeof field.options === 'function'
                    ? field.options(formValues)
                    : (field.options ?? []);
                return (
                  <SelectInput
                    key={field.key}
                    id={`${testId}-${field.key}-input`}
                    label={field.label}
                    placeholder={field.placeholder}
                    options={resolvedOptions}
                    disabled={isFieldDisabled}
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  />
                );
              }
              if (field.type === 'decimal') {
                return (
                  <DecimalInput
                    key={field.key}
                    id={`${testId}-${field.key}-input`}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={formValues[field.key] ?? ''}
                    onChange={(rawVal) => handleFieldChange(field.key, rawVal)}
                  />
                );
              }
              return (
                <TextInput
                  key={field.key}
                  id={`${testId}-${field.key}-input`}
                  type={field.type ?? 'text'}
                  step={field.step}
                  min={field.min}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={formValues[field.key] ?? ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              );
            })}
            <div
              className={
                isMultiRowForm
                  ? 'flex items-center justify-end gap-2 md:justify-start'
                  : 'flex items-center gap-2'
              }
            >
              <Button type="submit" variant="primary" disabled={loading}>
                {editingItem ? 'Perbarui' : 'Tambah'}
              </Button>
              {editingItem && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelEdit}
                >
                  Batal
                </Button>
              )}
            </div>
          </form>
        )}

        {summary}

        <DataTable
          columns={columns}
          data={paginatedItems}
          rowKey={(row) => row.id}
          emptyMessage={emptyMessage}
        />

        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={items.length}
          testId={`${testId}-pagination`}
          onPageChange={setCurrentPage}
        />
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
}
