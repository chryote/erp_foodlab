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

export interface NamedCrudEntity {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface CrudFieldConfig<T> {
  key: keyof T & string;
  label: string;
  placeholder?: string;
}

export interface CrudModalProps<T extends NamedCrudEntity> {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  testId?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  fields?: CrudFieldConfig<T>[];
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

export function CrudModal<T extends NamedCrudEntity>({
  isOpen,
  title,
  subtitle,
  testId = 'crud-modal',
  inputLabel = 'Nama',
  inputPlaceholder = 'Masukkan nama...',
  fields,
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
    return items.filter((item) =>
      resolvedFields.some((field) => {
        const val = item[field.key];
        return (
          typeof val === 'string' && val.toLowerCase().includes(q)
        );
      })
    );
  }, [items, resolvedFields, searchQuery]);

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
      nextValues[field.key] = typeof raw === 'string' ? raw : '';
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
      key: 'id',
      header: 'ID',
      render: (row) => <code>{row.id}</code>,
    },
    ...resolvedFields.map((field) => ({
      key: field.key,
      header: field.label,
      render: (row: T) => String(row[field.key] ?? ''),
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
        {resolvedFields.map((field) => (
          <TextInput
            key={field.key}
            id={`${testId}-${field.key}-input`}
            label={field.label}
            placeholder={field.placeholder}
            value={formValues[field.key] ?? ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        ))}
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
