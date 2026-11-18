import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { DataTable } from './DataTable';

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

export interface CrudModalProps<T extends NamedCrudEntity> {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  testId?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  emptyMessage?: string;
  items: T[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: (name: string) => Promise<void> | void;
  onUpdate: (id: number, name: string) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
}

export function CrudModal<T extends NamedCrudEntity>({
  isOpen,
  title,
  subtitle,
  testId = 'crud-modal',
  inputLabel = 'Nama',
  inputPlaceholder = 'Masukkan nama...',
  emptyMessage = 'Belum ada data.',
  items,
  loading = false,
  error = null,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: CrudModalProps<T>): React.ReactElement | null {
  const [nameInput, setNameInput] = useState('');
  const [editingItem, setEditingItem] = useState<T | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setNameInput('');
      setEditingItem(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      return;
    }

    if (editingItem) {
      await onUpdate(editingItem.id, trimmed);
      setEditingItem(null);
      setNameInput('');
    } else {
      await onCreate(trimmed);
      setNameInput('');
    }
  };

  const handleStartEdit = (item: T) => {
    setEditingItem(item);
    setNameInput(item.name);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setNameInput('');
  };

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
        <TextInput
          id={`${testId}-name-input`}
          label={inputLabel}
          placeholder={inputPlaceholder}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
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

      <DataTable
        columns={[
          {
            key: 'id',
            header: 'ID',
            render: (row) => <code>{row.id}</code>,
          },
          {
            key: 'name',
            header: inputLabel,
            render: (row) => row.name,
          },
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
        ]}
        data={items}
        rowKey={(row) => row.id}
        emptyMessage={emptyMessage}
      />
    </Modal>
  );
}
