import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './Button';
import { DataTable, type DataTableColumn } from './DataTable';
import { Pagination, TableFilterBar } from './Pagination';

export interface ModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  testId?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  subtitle,
  testId = 'ui-modal',
  onClose,
  children,
  footer,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="ui-modal-backdrop"
      data-testid={`${testId}-backdrop`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className="ui-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-modal-header">
          <div>
            <h2 className="ui-modal-title">{title}</h2>
            {subtitle && <p className="ui-subtitle">{subtitle}</p>}
          </div>
          <Button
            variant="secondary"
            aria-label="Tutup Modal"
            onClick={onClose}
          >
            Tutup
          </Button>
        </div>

        <div className="ui-modal-body">{children}</div>

        {footer && <div className="ui-modal-footer">{footer}</div>}
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
  className = '',
  ...rest
}) => {
  return (
    <div className="ui-input-group">
      {label && (
        <label htmlFor={id} className="ui-input-label">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`ui-input ${className}`.trim()}
        {...rest}
      />
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

  // In Indonesian format, comma (,) is the decimal separator and dots (.) are thousand separators
  if (trimmed.includes(',')) {
    const [intSide = '', ...fracParts] = trimmed.split(',');
    const cleanInt = intSide.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    const cleanFrac = fracParts.join('').replace(/\D/g, '');
    return `${cleanInt || '0'}.${cleanFrac}`;
  }

  // If a plain decimal number with a single dot is pasted/set at once (e.g. "500000000.75" or "625000000.25")
  const dotParts = trimmed.split('.');
  if (dotParts.length === 2) {
    const [left = '', right = ''] = dotParts;
    if (left.length > 3 && right.length > 0 && right.length <= 2) {
      const cleanLeft = left.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      const cleanRight = right.replace(/\D/g, '');
      return `${cleanLeft || '0'}.${cleanRight}`;
    }
  }

  // Otherwise, all dots in displayValue are thousand separators; strip non-digits
  return trimmed.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export const DecimalInput: React.FC<DecimalInputProps> = ({
  label,
  id,
  value,
  onChange,
  className = '',
  ...rest
}) => {
  const displayValue = useMemo(() => formatDecimalInputDisplay(value), [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextRaw = parseDecimalInputRaw(e.target.value);
    onChange(nextRaw);
  };

  return (
    <div className="ui-input-group">
      {label && (
        <label htmlFor={id} className="ui-input-label">
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={`ui-input ${className}`.trim()}
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
  className = '',
  ...rest
}) => {
  return (
    <div className="ui-input-group">
      {label && (
        <label htmlFor={id} className="ui-input-label">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`ui-input ${className}`.trim()}
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
    <div className="ui-summary-banner" data-testid={testId}>
      <span className="ui-summary-banner-label">{label}</span>
      <strong
        className="ui-summary-banner-value"
        data-testid={`${testId}-value`}
      >
        {value}
      </strong>
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
  type?: 'text' | 'number' | 'decimal' | 'select';
  step?: string | number;
  min?: string | number;
  options?: SelectOption[];
  renderValue?: (row: T) => React.ReactNode;
  filterText?: (row: T) => string;
}

export interface CrudComputedColumnConfig<T> {
  key: string;
  label: string;
  render: (row: T, index: number) => React.ReactNode;
  filterText?: (row: T) => string;
}

export interface CrudModalProps<T extends CrudEntity> {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  testId?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  fields?: CrudFieldConfig<T>[];
  computedColumns?: CrudComputedColumnConfig<T>[];
  summary?: React.ReactNode;
  emptyMessage?: string;
  filterLabel?: string;
  filterPlaceholder?: string;
  pageSize?: number;
  items: T[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: (values: Record<string, string>) => Promise<void> | void;
  onUpdate: (
    id: number,
    values: Record<string, string>
  ) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
}

export function CrudModal<T extends CrudEntity>({
  isOpen,
  title,
  subtitle,
  testId = 'crud-modal',
  inputLabel = 'Nama',
  inputPlaceholder = 'Masukkan nama...',
  fields,
  computedColumns = [],
  summary,
  emptyMessage = 'Belum ada data.',
  filterLabel = 'Filter Data',
  filterPlaceholder = 'Cari berdasarkan nama...',
  pageSize = 5,
  items,
  loading = false,
  error = null,
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
      initial[f.key] = '';
    }
    return initial;
  };

  const [formValues, setFormValues] = useState<Record<string, string>>(
    createEmptyFormValues
  );
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setFormValues(createEmptyFormValues());
      setEditingItem(null);
      setSearchQuery('');
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(
      (item) =>
        resolvedFields.some((field) => {
          if (field.filterText) {
            return field.filterText(item).toLowerCase().includes(q);
          }
          const val = item[field.key];
          return (
            val !== null &&
            val !== undefined &&
            String(val).toLowerCase().includes(q)
          );
        }) ||
        computedColumns.some((col) =>
          col.filterText ? col.filterText(item).toLowerCase().includes(q) : false
        )
    );
  }, [items, resolvedFields, computedColumns, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValues: Record<string, string> = {};
    for (const field of resolvedFields) {
      const val = (formValues[field.key] ?? '').trim();
      if (!val) {
        return;
      }
      trimmedValues[field.key] = val;
    }

    if (editingItem) {
      await onUpdate(editingItem.id, trimmedValues);
      setEditingItem(null);
      setFormValues(createEmptyFormValues());
    } else {
      await onCreate(trimmedValues);
      setFormValues(createEmptyFormValues());
      setCurrentPage(1);
    }
  };

  const handleStartEdit = (item: T) => {
    setEditingItem(item);
    const nextValues: Record<string, string> = {};
    for (const field of resolvedFields) {
      const raw = item[field.key];
      nextValues[field.key] =
        raw !== null && raw !== undefined ? String(raw) : '';
    }
    setFormValues(nextValues);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormValues(createEmptyFormValues());
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
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
          const match = field.options.find(
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
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div className="ui-table-actions">
          <Button
            variant="secondary"
            data-testid={`edit-row-${row.id}`}
            onClick={() => handleStartEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            data-testid={`delete-row-${row.id}`}
            onClick={() => void onDelete(row.id)}
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      subtitle={subtitle}
      testId={testId}
      onClose={onClose}
    >
      {error && (
        <div role="alert" className="alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="ui-crud-form">
        {resolvedFields.map((field) => {
          if (field.type === 'select') {
            return (
              <SelectInput
                key={field.key}
                id={`${testId}-${field.key}-input`}
                label={field.label}
                placeholder={field.placeholder}
                options={field.options ?? []}
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
        <div className="ui-crud-form-actions">
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

      <TableFilterBar
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        searchLabel={filterLabel}
        searchPlaceholder={filterPlaceholder}
        testId={`${testId}-filter`}
      />

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
        totalItems={filteredItems.length}
        testId={`${testId}-pagination`}
        onPageChange={setCurrentPage}
      />
    </Modal>
  );
}
