import React, { useCallback, useEffect, useState } from 'react';
import {
  type Company,
  createCompany,
  deleteCompany,
  fetchCompanies,
  updateCompany,
} from '../../api/client';
import { type CrudFieldConfig, CrudModal } from '../../components/ui';

export const COMPANY_CRUD_FIELDS: CrudFieldConfig<Company>[] = [
  {
    key: 'name',
    label: 'Nama Perusahaan',
    placeholder: 'Contoh: PT. ABC DEF',
  },
];

export interface CompanyCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyCrudModal: React.FC<CompanyCrudModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCompanies();
      setCompanies(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat data perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadCompanies();
    }
  }, [isOpen, loadCompanies]);

  const handleCreate = async (values: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createCompany({
        name: values.name ?? '',
      });
      setCompanies((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menambahkan perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number, values: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await updateCompany(id, {
        name: values.name ?? '',
      });
      setCompanies((prev) =>
        prev.map((item) => (item.id === id ? res.data : item))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memperbarui perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteCompany(id);
      setCompanies((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CrudModal
      isOpen={isOpen}
      title="Manajemen Perusahaan"
      subtitle="Kelola data perusahaan pada modul CFO (Input Modal)"
      testId="perusahaan-crud-modal"
      fields={COMPANY_CRUD_FIELDS}
      emptyMessage="Belum ada data perusahaan."
      pageSize={5}
      items={companies}
      loading={loading}
      error={error}
      onClose={onClose}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
};
