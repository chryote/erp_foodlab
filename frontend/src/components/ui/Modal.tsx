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
  dialogClassName?: string;
  bodyClassName?: string;
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
  dialogClassName,
  bodyClassName,
  onClose,
  children,
  footer,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6 backdrop-blur-xs"
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
          maxWidthClass,
          dialogClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
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

        <div
          className={cn(
            'flex flex-col gap-4 overflow-y-auto px-6 py-5',
            !bodyClassName && '[&>*]:shrink-0',
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-2.5 border-t border-border px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export type FieldLabelPlacement = 'top' | 'left';

interface FieldWrapperProps {
  id?: string;
  label?: string;
  labelPlacement?: FieldLabelPlacement;
  alignTop?: boolean;
  error?: string;
  children: React.ReactNode;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({
  id,
  label,
  labelPlacement = 'top',
  alignTop = false,
  error,
  children,
}) => {
  if (labelPlacement === 'left') {
    return (
      <div
        data-testid={id ? `${id}-field` : undefined}
        className="grid min-w-0 grid-cols-1 items-center gap-1.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3"
      >
        {label && (
          <ShadcnLabel
            htmlFor={id}
            className={cn(
              'leading-snug text-foreground',
              alignTop && 'sm:self-start sm:pt-2'
            )}
          >
            {label}
          </ShadcnLabel>
        )}
        <div className="min-w-0">
          {children}
          {error && (
            <p className="mt-1 text-xs text-red-600" role="status">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {label && <ShadcnLabel htmlFor={id}>{label}</ShadcnLabel>}
      {children}
      {error && (
        <p className="text-xs text-red-600" role="status">
          {error}
        </p>
      )}
    </div>
  );
};

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelPlacement?: FieldLabelPlacement;
  error?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  labelPlacement = 'top',
  id,
  className,
  error,
  ...rest
}) => {
  return (
    <FieldWrapper
      id={id}
      label={label}
      labelPlacement={labelPlacement}
      error={error}
    >
      <ShadcnInput
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          error && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
        {...rest}
      />
    </FieldWrapper>
  );
};

export interface TextareaInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelPlacement?: FieldLabelPlacement;
  error?: string;
}

export const TextareaInput: React.FC<TextareaInputProps> = ({
  label,
  labelPlacement = 'top',
  id,
  className,
  rows = 2,
  error,
  ...rest
}) => {
  return (
    <FieldWrapper
      id={id}
      label={label}
      labelPlacement={labelPlacement}
      alignTop={true}
      error={error}
    >
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(
          'flex min-h-[60px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
          error && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
        {...rest}
      />
    </FieldWrapper>
  );
};

export interface DecimalInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
  > {
  label?: string;
  labelPlacement?: FieldLabelPlacement;
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
  labelPlacement = 'top',
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
    <FieldWrapper id={id} label={label} labelPlacement={labelPlacement}>
      <ShadcnInput
        id={id}
        type="text"
        inputMode="decimal"
        className={className}
        value={displayValue}
        onChange={handleChange}
        {...rest}
      />
    </FieldWrapper>
  );
};

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelPlacement?: FieldLabelPlacement;
  placeholder?: string;
  options: SelectOption[];
  error?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  labelPlacement = 'top',
  id,
  placeholder = 'Pilih opsi...',
  options,
  className,
  error,
  ...rest
}) => {
  return (
    <FieldWrapper
      id={id}
      label={label}
      labelPlacement={labelPlacement}
      error={error}
    >
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
          error && 'border-red-500 focus-visible:ring-red-500',
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
    </FieldWrapper>
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
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/35 bg-primary/10 px-4 py-3"
      data-testid={testId}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <strong
        className="text-base font-bold text-primary"
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
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-6 backdrop-blur-xs"
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

export interface ValidationErrorDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  errors: string[];
  closeLabel?: string;
  testId?: string;
  onClose: () => void;
}

export const ValidationErrorDialog: React.FC<ValidationErrorDialogProps> = ({
  isOpen,
  title = 'Validasi Gagal',
  message = 'Mohon periksa kembali isian formulir Anda:',
  errors,
  closeLabel = 'Mengerti',
  testId = 'validation-error-dialog',
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-6 backdrop-blur-xs"
      data-testid={`${testId}-backdrop`}
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-red-200 bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50/80 px-6 py-4">
          <h3 className="text-base font-bold tracking-tight text-red-800">
            {title}
          </h3>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-6 py-4 text-sm text-muted-foreground">
          {message && <p className="font-medium text-foreground">{message}</p>}
          {errors.length > 0 && (
            <ul
              data-testid={`${testId}-list`}
              className="list-disc space-y-1.5 pl-5 text-xs text-red-700"
            >
              {errors.map((item, idx) => (
                <li key={`${idx}-${item}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-3.5">
          <Button
            type="button"
            variant="primary"
            data-testid={`${testId}-close`}
            onClick={onClose}
          >
            {closeLabel}
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
  type?:
    | 'text'
    | 'number'
    | 'decimal'
    | 'select'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'textarea';
  rows?: number;
  pickerOnly?: boolean;
  optional?: boolean;
  hideInTable?: boolean;
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
  layout?: 'stacked' | 'split';
  labelPlacement?: FieldLabelPlacement;
  modalSize?: 'default' | 'expanded';
  maxWidthClass?: string;
  dialogClassName?: string;
  formLayout?: 'auto' | 'single-row';
  formAlign?: 'start' | 'end';
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
  layout = 'stacked',
  labelPlacement = 'top',
  modalSize = 'default',
  maxWidthClass,
  dialogClassName,
  formLayout = 'auto',
  formAlign,
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
          field.type === 'date'
            ? stringified.slice(0, 10)
            : field.type === 'time'
              ? stringified.slice(0, 5)
              : field.type === 'datetime-local'
                ? stringified.slice(0, 16).replace(' ', 'T')
                : stringified;
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
    ...resolvedFields
      .filter((field) => !field.hideInTable)
      .map((field) => ({
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

  const isSingleRowForm = formLayout === 'single-row';
  const isMultiRowForm = !isSingleRowForm && resolvedFields.length > 4;
  const alignStart = (formAlign ?? (isMultiRowForm ? 'start' : 'end')) === 'start';

  const renderFieldControl = (field: CrudFieldConfig<T>) => {
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
          labelPlacement={labelPlacement}
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
          labelPlacement={labelPlacement}
          placeholder={field.placeholder}
          value={formValues[field.key] ?? ''}
          onChange={(rawVal) => handleFieldChange(field.key, rawVal)}
        />
      );
    }
    if (field.type === 'textarea') {
      return (
        <TextareaInput
          key={field.key}
          id={`${testId}-${field.key}-input`}
          label={field.label}
          labelPlacement={labelPlacement}
          placeholder={field.placeholder}
          rows={field.rows ?? 2}
          value={formValues[field.key] ?? ''}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
        />
      );
    }
    const isPickerOnlyDate = field.type === 'date' && field.pickerOnly;
    return (
      <TextInput
        key={field.key}
        id={`${testId}-${field.key}-input`}
        type={field.type ?? 'text'}
        step={field.step}
        min={field.min}
        label={field.label}
        labelPlacement={labelPlacement}
        placeholder={field.placeholder}
        className={
          isPickerOnlyDate
            ? 'cursor-pointer select-none caret-transparent'
            : undefined
        }
        value={formValues[field.key] ?? ''}
        onKeyDown={
          isPickerOnlyDate
            ? (e) => {
                if (e.key !== 'Tab' && e.key !== 'Escape') {
                  e.preventDefault();
                }
              }
            : undefined
        }
        onPaste={isPickerOnlyDate ? (e) => e.preventDefault() : undefined}
        onDrop={isPickerOnlyDate ? (e) => e.preventDefault() : undefined}
        onClick={
          isPickerOnlyDate
            ? (e) => {
                const input = e.currentTarget as HTMLInputElement & {
                  showPicker?: () => void;
                };
                if (typeof input.showPicker === 'function') {
                  try {
                    input.showPicker();
                  } catch {
                    // Ignore if browser restricts programmatic picker opening
                  }
                }
              }
            : undefined
        }
        onChange={(e) => handleFieldChange(field.key, e.target.value)}
      />
    );
  };

  const isSplitLayout = layout === 'split';
  const isExpandedModal = modalSize === 'expanded';
  const resolvedMaxWidthClass =
    maxWidthClass ??
    (isExpandedModal
      ? 'max-w-[95vw]'
      : isSingleRowForm
        ? 'max-w-7xl'
        : isMultiRowForm
          ? 'max-w-5xl'
          : 'max-w-3xl');
  const resolvedDialogClassName =
    dialogClassName ?? (isExpandedModal ? 'h-[92vh] max-h-[92vh]' : undefined);

  const formActionButtons = (
    <>
      <Button type="submit" variant="primary" disabled={loading}>
        {editingItem ? 'Perbarui' : 'Tambah'}
      </Button>
      {editingItem && (
        <Button type="button" variant="ghost" onClick={handleCancelEdit}>
          Batal
        </Button>
      )}
    </>
  );

  const dataTableElement = (
    <DataTable
      columns={columns}
      data={paginatedItems}
      rowKey={(row) => row.id}
      emptyMessage={emptyMessage}
    />
  );

  const paginationElement = (
    <Pagination
      currentPage={safeCurrentPage}
      totalPages={totalPages}
      totalItems={items.length}
      testId={`${testId}-pagination`}
      onPageChange={setCurrentPage}
    />
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        title={title}
        subtitle={subtitle}
        testId={testId}
        maxWidthClass={resolvedMaxWidthClass}
        dialogClassName={resolvedDialogClassName}
        bodyClassName={
          isSplitLayout
            ? 'flex-1 min-h-0 overflow-y-auto lg:overflow-hidden'
            : undefined
        }
        onClose={onClose}
      >
        {tabs && <div className="shrink-0">{tabs}</div>}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-sm text-primary"
          >
            {error}
          </div>
        )}

        {isSplitLayout ? (
          <div
            data-testid={`${testId}-split-layout`}
            className={cn(
              'grid min-h-0 flex-1 grid-cols-1 gap-6',
              !readOnly &&
                (labelPlacement === 'left'
                  ? 'lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[460px_minmax(0,1fr)]'
                  : 'lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]')
            )}
          >
            {!readOnly && (
              <div
                data-testid={`${testId}-form-panel`}
                className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/25 p-4 lg:overflow-y-auto"
              >
                <form
                  onSubmit={handleSubmit}
                  data-testid={`${testId}-form`}
                  className="flex flex-col gap-4"
                >
                  <div className="border-b border-border pb-2.5">
                    <h3 className="text-sm font-semibold text-foreground">
                      {editingItem ? 'Edit Data' : 'Tambah Data'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {editingItem
                        ? 'Perbarui data yang dipilih lalu simpan perubahan.'
                        : 'Lengkapi formulir di bawah ini untuk menambahkan data baru.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {resolvedFields.map((field) => renderFieldControl(field))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {formActionButtons}
                  </div>
                </form>
              </div>
            )}

            <div
              data-testid={`${testId}-table-panel`}
              className="flex min-h-0 min-w-0 flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
                {summary}
                {dataTableElement}
              </div>

              <div className="shrink-0 border-t border-border pt-3">
                {paginationElement}
              </div>
            </div>
          </div>
        ) : (
          <>
            {!readOnly && (
              <form
                onSubmit={handleSubmit}
                data-testid={`${testId}-form`}
                className={
                  isSingleRowForm
                    ? cn(
                        'flex flex-wrap gap-2.5 border-b border-border pb-4',
                        alignStart ? 'items-start' : 'items-end'
                      )
                    : isMultiRowForm
                      ? cn(
                          'grid grid-cols-1 gap-3 border-b border-border pb-4 sm:grid-cols-2 md:grid-cols-4',
                          alignStart ? 'items-start' : 'items-end'
                        )
                      : cn(
                          'flex flex-wrap gap-2.5 border-b border-border pb-4',
                          alignStart ? 'items-start' : 'items-end'
                        )
                }
              >
                {resolvedFields.map((field) => {
                  const control = renderFieldControl(field);
                  if (!isSingleRowForm) {
                    return control;
                  }
                  return (
                    <div
                      key={field.key}
                      className="flex min-w-[140px] flex-1 flex-col"
                    >
                      {control}
                    </div>
                  );
                })}
                <div
                  className={
                    isSingleRowForm
                      ? cn(
                          'flex shrink-0 items-center gap-2',
                          alignStart && 'pt-[20px]'
                        )
                      : isMultiRowForm
                        ? 'flex items-center justify-end gap-2 sm:pt-[20px] md:justify-start'
                        : cn('flex items-center gap-2', alignStart && 'pt-[20px]')
                  }
                >
                  {formActionButtons}
                </div>
              </form>
            )}

            {summary}
            {dataTableElement}
            {paginationElement}
          </>
        )}
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
