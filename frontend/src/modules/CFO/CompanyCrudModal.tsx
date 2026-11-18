import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CapitalCompany,
  type Company,
  createCapitalCompany,
  createCompany,
  deleteCapitalCompany,
  deleteCompany,
  fetchCapitalCompanies,
  fetchCompanies,
  updateCapitalCompany,
  updateCompany,
} from '../../api/client';
import {
  Badge,
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
  SummaryBanner,
} from '../../components/ui';
import {
  formatCapitalIdr,
  formatCapitalSharePercent,
} from './CapitalCompanyCrudModal';

export const COMPANY_CRUD_FIELDS: CrudFieldConfig<Company>[] = [
  {
    key: 'name',
    label: 'Nama Perusahaan',
    placeholder: 'Contoh: PT. ABC DEF',
  },
];

export const STAKEHOLDER_CRUD_FIELDS: CrudFieldConfig<CapitalCompany>[] = [
  {
    key: 'stakeholder_name',
    label: 'Nama Pemegang Saham',
    placeholder: 'Contoh: Budi Santoso',
  },
  {
    key: 'capital',
    label: 'Kapital (Rp)',
    type: 'decimal',
    placeholder: 'Contoh: 250.000.000',
    renderValue: (row) => formatCapitalIdr(Number(row.capital)),
    filterText: (row) =>
      `${row.capital} ${formatCapitalIdr(Number(row.capital))}`,
  },
];

export interface CompanyStakeholderModalProps {
  isOpen: boolean;
  company: Company | null;
  readOnly?: boolean;
  onClose: () => void;
}

export const CompanyStakeholderModal: React.FC<
  CompanyStakeholderModalProps
> = ({ isOpen, company, readOnly = false, onClose }) => {
  const [stakeholders, setStakeholders] = useState<CapitalCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStakeholders = useCallback(async () => {
    if (!company) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCapitalCompanies();
      setStakeholders(
        res.data.filter((item) => item.company_id === company.id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data pemegang saham.'
      );
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (isOpen && company) {
      void loadStakeholders();
    } else {
      setStakeholders([]);
      setError(null);
    }
  }, [isOpen, company, loadStakeholders]);

  const totalCompanyCapital = useMemo(() => {
    return stakeholders.reduce(
      (sum, item) => sum + (Number(item.capital) || 0),
      0
    );
  }, [stakeholders]);

  const computedColumns = useMemo<
    CrudComputedColumnConfig<CapitalCompany>[]
  >(() => {
    return [
      {
        key: 'share_percent',
        label: 'Porsi Kapital (%)',
        render: (row) => (
          <Badge variant="ok">
            {formatCapitalSharePercent(
              Number(row.capital),
              totalCompanyCapital
            )}
          </Badge>
        ),
        filterText: (row) =>
          formatCapitalSharePercent(Number(row.capital), totalCompanyCapital),
      },
    ];
  }, [totalCompanyCapital]);

  const handleCreate = async (values: Record<string, string>) => {
    if (!company) {
      return;
    }
    const stakeholderName = (values.stakeholder_name ?? '').trim();
    const capital = parseFloat(values.capital ?? '');
    if (!stakeholderName || !Number.isFinite(capital)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createCapitalCompany({
        company_id: company.id,
        stakeholder_name: stakeholderName,
        capital,
      });
      setStakeholders((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menambahkan pemegang saham.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number, values: Record<string, string>) => {
    if (!company) {
      return;
    }
    const stakeholderName = (values.stakeholder_name ?? '').trim();
    const capital = parseFloat(values.capital ?? '');
    if (!stakeholderName || !Number.isFinite(capital)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await updateCapitalCompany(id, {
        company_id: company.id,
        stakeholder_name: stakeholderName,
        capital,
      });
      setStakeholders((prev) =>
        prev.map((item) => (item.id === id ? res.data : item))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memperbarui pemegang saham.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteCapitalCompany(id);
      setStakeholders((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus pemegang saham.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CrudModal
      isOpen={isOpen && company !== null}
      title={readOnly ? 'Detail Pemegang Saham' : 'Input Pemegang Saham'}
      subtitle={
        company
          ? readOnly
            ? `Daftar pemegang saham & modal untuk ${company.name}`
            : `Kelola pemegang saham & modal untuk ${company.name}`
          : undefined
      }
      testId={
        readOnly ? 'detail-pemegang-saham-modal' : 'pemegang-saham-crud-modal'
      }
      fields={STAKEHOLDER_CRUD_FIELDS}
      computedColumns={computedColumns}
      summary={
        <SummaryBanner
          label={`Total Kapital ${company?.name ?? 'Perusahaan'}`}
          value={formatCapitalIdr(totalCompanyCapital)}
          testId={
            readOnly
              ? 'total-kapital-detail-pemegang-saham-banner'
              : 'total-kapital-pemegang-saham-banner'
          }
        />
      }
      emptyMessage="Belum ada data pemegang saham untuk perusahaan ini."
      pageSize={5}
      items={stakeholders}
      loading={loading}
      error={error}
      readOnly={readOnly}
      onClose={onClose}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
};

export interface CompanyCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyCrudModal: React.FC<CompanyCrudModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedStakeholderCompany, setSelectedStakeholderCompany] =
    useState<Company | null>(null);
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
    } else {
      setSelectedStakeholderCompany(null);
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
      setSelectedStakeholderCompany((prev) =>
        prev?.id === id ? res.data : prev
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
      setSelectedStakeholderCompany((prev) => (prev?.id === id ? null : prev));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CrudModal
        isOpen={isOpen}
        title="Manajemen Perusahaan"
        subtitle="Kelola data perusahaan pada modul CFO (Input Modal)"
        testId="perusahaan-crud-modal"
        fields={COMPANY_CRUD_FIELDS}
        rowActions={[
          {
            key: 'stakeholder',
            label: 'Input Pemegang Saham',
            variant: 'secondary',
            testId: (row) => `stakeholder-row-${row.id}`,
            onClick: (row) => setSelectedStakeholderCompany(row),
          },
        ]}
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

      <CompanyStakeholderModal
        isOpen={isOpen && selectedStakeholderCompany !== null}
        company={selectedStakeholderCompany}
        onClose={() => setSelectedStakeholderCompany(null)}
      />
    </>
  );
};
