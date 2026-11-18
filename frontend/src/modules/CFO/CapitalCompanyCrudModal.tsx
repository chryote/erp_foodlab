import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CapitalCompany,
  type Company,
  createCapitalCompany,
  deleteCapitalCompany,
  fetchCapitalCompanies,
  fetchCompanies,
  updateCapitalCompany,
} from '../../api/client';
import {
  Badge,
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
  SummaryBanner,
} from '../../components/ui';

export function formatCapitalIdr(amount: number): string {
  if (!Number.isFinite(amount)) {
    return 'Rp 0';
  }
  return `Rp ${amount.toLocaleString('id-ID', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCapitalSharePercent(
  capital: number,
  totalCapital: number
): string {
  if (!Number.isFinite(capital) || !Number.isFinite(totalCapital) || totalCapital <= 0) {
    return '0%';
  }
  const pct = (capital / totalCapital) * 100;
  return `${pct.toLocaleString('id-ID', {
    minimumFractionDigits: Number.isInteger(pct) ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
}

export interface CapitalCompanyCrudModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CapitalCompanyCrudModal: React.FC<
  CapitalCompanyCrudModalProps
> = ({ isOpen, onClose }) => {
  const [capitalCompanies, setCapitalCompanies] = useState<CapitalCompany[]>(
    []
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [capitalRes, companiesRes] = await Promise.all([
        fetchCapitalCompanies(),
        fetchCompanies(),
      ]);
      setCapitalCompanies(capitalRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data kapital perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  const companyById = useMemo(() => {
    const map = new Map<number, Company>();
    for (const c of companies) {
      map.set(c.id, c);
    }
    return map;
  }, [companies]);

  const totalCapital = useMemo(() => {
    return capitalCompanies.reduce(
      (sum, item) => sum + (Number(item.capital) || 0),
      0
    );
  }, [capitalCompanies]);

  const fields = useMemo<CrudFieldConfig<CapitalCompany>[]>(() => {
    return [
      {
        key: 'company_id',
        label: 'Perusahaan',
        type: 'select',
        placeholder: 'Pilih Perusahaan...',
        options: companies.map((c) => ({
          value: String(c.id),
          label: c.stakeholder_name
            ? `${c.name} (${c.stakeholder_name})`
            : c.name,
        })),
        renderValue: (row) => {
          const company = row.company ?? companyById.get(row.company_id);
          if (!company) {
            return `#${row.company_id}`;
          }
          return company.stakeholder_name
            ? `${company.name} (${company.stakeholder_name})`
            : company.name;
        },
        filterText: (row) => {
          const company = row.company ?? companyById.get(row.company_id);
          return `${company?.name ?? ''} ${company?.stakeholder_name ?? ''} ${row.company_id}`;
        },
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
  }, [companies, companyById]);

  const computedColumns = useMemo<
    CrudComputedColumnConfig<CapitalCompany>[]
  >(() => {
    return [
      {
        key: 'share_percent',
        label: 'Porsi Kapital (%)',
        render: (row) => (
          <Badge variant="ok">
            {formatCapitalSharePercent(Number(row.capital), totalCapital)}
          </Badge>
        ),
        filterText: (row) =>
          formatCapitalSharePercent(Number(row.capital), totalCapital),
      },
    ];
  }, [totalCapital]);

  const handleCreate = async (values: Record<string, string>) => {
    const companyId = Number(values.company_id);
    const capital = parseFloat(values.capital ?? '');
    if (!Number.isFinite(companyId) || !Number.isFinite(capital)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createCapitalCompany({
        company_id: companyId,
        capital,
      });
      setCapitalCompanies((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menambahkan kapital perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number, values: Record<string, string>) => {
    const companyId = Number(values.company_id);
    const capital = parseFloat(values.capital ?? '');
    if (!Number.isFinite(companyId) || !Number.isFinite(capital)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await updateCapitalCompany(id, {
        company_id: companyId,
        capital,
      });
      setCapitalCompanies((prev) =>
        prev.map((item) => (item.id === id ? res.data : item))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memperbarui kapital perusahaan.'
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
      setCapitalCompanies((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus kapital perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CrudModal
      isOpen={isOpen}
      title="Daftar Kapital Perusahaan"
      subtitle="Kelola data kapital (modal) perusahaan pada modul CFO (Input Modal)"
      testId="daftar-kapital-perusahaan-crud-modal"
      fields={fields}
      computedColumns={computedColumns}
      summary={
        <SummaryBanner
          label="Total Kapital Seluruh Perusahaan"
          value={formatCapitalIdr(totalCapital)}
          testId="total-kapital-perusahaan-banner"
        />
      }
      filterLabel="Filter Perusahaan / Kapital"
      filterPlaceholder="Cari nama perusahaan, stakeholder, atau nominal kapital..."
      emptyMessage="Belum ada data kapital perusahaan."
      pageSize={5}
      items={capitalCompanies}
      loading={loading}
      error={error}
      onClose={onClose}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
};
