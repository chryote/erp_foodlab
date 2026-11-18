import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CapitalCompany,
  type Company,
  fetchCapitalCompanies,
  fetchCompanies,
} from '../../api/client';
import { type CrudFieldConfig, CrudModal } from '../../components/ui';
import { CompanyStakeholderModal } from './CompanyCrudModal';

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
  const [selectedDetailCompany, setSelectedDetailCompany] =
    useState<Company | null>(null);
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
    } else {
      setSelectedDetailCompany(null);
    }
  }, [isOpen, loadData]);

  const companyById = useMemo(() => {
    const map = new Map<number, Company>();
    for (const c of companies) {
      map.set(c.id, c);
    }
    return map;
  }, [companies]);

  const groupedCapitalCompanies = useMemo<CapitalCompany[]>(() => {
    const groupedMap = new Map<
      number,
      {
        company_id: number;
        company?: Company | null;
        stakeholders: string[];
        totalCapital: number;
      }
    >();

    for (const item of capitalCompanies) {
      const existing = groupedMap.get(item.company_id);
      const stakeholderName = (item.stakeholder_name ?? '').trim();
      const amount = Number(item.capital) || 0;

      if (existing) {
        if (
          stakeholderName &&
          !existing.stakeholders.includes(stakeholderName)
        ) {
          existing.stakeholders.push(stakeholderName);
        }
        existing.totalCapital += amount;
        if (!existing.company && item.company) {
          existing.company = item.company;
        }
      } else {
        groupedMap.set(item.company_id, {
          company_id: item.company_id,
          company: item.company ?? companyById.get(item.company_id) ?? null,
          stakeholders: stakeholderName ? [stakeholderName] : [],
          totalCapital: amount,
        });
      }
    }

    return Array.from(groupedMap.values()).map((group) => ({
      id: group.company_id,
      company_id: group.company_id,
      stakeholder_name: group.stakeholders.join(', '),
      capital: group.totalCapital,
      company: group.company ?? companyById.get(group.company_id) ?? null,
    }));
  }, [capitalCompanies, companyById]);

  const fields = useMemo<CrudFieldConfig<CapitalCompany>[]>(() => {
    return [
      {
        key: 'company_id',
        label: 'Perusahaan',
        type: 'select',
        placeholder: 'Pilih Perusahaan...',
        options: companies.map((c) => ({
          value: String(c.id),
          label: c.name,
        })),
        renderValue: (row) => {
          const company = row.company ?? companyById.get(row.company_id);
          if (!company) {
            return `#${row.company_id}`;
          }
          return company.name;
        },
        filterText: (row) => {
          const company = row.company ?? companyById.get(row.company_id);
          return `${company?.name ?? ''} ${row.company_id}`;
        },
      },
      {
        key: 'stakeholder_name',
        label: 'Nama Pemegang Saham',
        type: 'text',
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
  }, [companies, companyById]);

  return (
    <>
      <CrudModal
        isOpen={isOpen}
        title="Daftar Kapital Perusahaan"
        subtitle="Kelola data kapital (modal) perusahaan pada modul CFO (Input Modal)"
        testId="daftar-kapital-perusahaan-crud-modal"
        fields={fields}
        rowActions={[
          {
            key: 'detail',
            label: 'Detail',
            variant: 'secondary',
            testId: (row) => `detail-row-${row.id}`,
            onClick: (row) => {
              const company =
                row.company ??
                companyById.get(row.company_id) ?? {
                  id: row.company_id,
                  name: `#${row.company_id}`,
                };
              setSelectedDetailCompany(company);
            },
          },
        ]}
        emptyMessage="Belum ada data kapital perusahaan."
        pageSize={5}
        items={groupedCapitalCompanies}
        loading={loading}
        error={error}
        readOnly={true}
        onClose={onClose}
      />

      <CompanyStakeholderModal
        isOpen={isOpen && selectedDetailCompany !== null}
        company={selectedDetailCompany}
        readOnly={true}
        onClose={() => setSelectedDetailCompany(null)}
      />
    </>
  );
};
