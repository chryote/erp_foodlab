import React, { useMemo } from 'react';
import type { Company, CompanyAsset } from '@/api/client';
import {
  type CrudComputedColumnConfig,
  type CrudFieldConfig,
  CrudModal,
  SummaryBanner,
} from '@/components/ui';
import { useCompanyAssetCrudResource } from '@/lib/cfoResources';
import { formatCapitalIdr } from './CapitalCompanyCrudModal';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface CompanyAssetCrudModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const CompanyAssetCrudModal: React.FC<CompanyAssetCrudModalProps> = ({
  isOpen,
  company,
  companies,
  onClose,
}) => {
  const { allAssets, loading, error, createAsset, updateAsset, removeAsset } =
    useCompanyAssetCrudResource(isOpen, company);

  const availableCompanies = useMemo<Company[]>(() => {
    if (companies && companies.length > 0) {
      return companies;
    }
    return company ? [company] : [];
  }, [companies, company]);

  const companyOptions = useMemo(
    () =>
      availableCompanies.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [availableCompanies]
  );

  const defaultCompanyId = company ? String(company.id) : '';
  const todayDate = useMemo(() => getTodayDateString(), []);

  const fields = useMemo<CrudFieldConfig<CompanyAsset>[]>(
    () => [
      {
        key: 'company_id',
        label: 'Pilih Perusahaan',
        type: 'select',
        placeholder: 'Pilih perusahaan...',
        defaultValue: defaultCompanyId,
        options: companyOptions,
        renderValue: (row) =>
          availableCompanies.find((c) => c.id === Number(row.company_id))
            ?.name ??
          row.company?.name ??
          String(row.company_id ?? ''),
      },
      {
        key: 'asset_date',
        label: 'Tanggal Aset',
        type: 'date',
        pickerOnly: true,
        defaultValue: todayDate,
        renderValue: (row) => row.asset_date ?? '-',
      },
      {
        key: 'name',
        label: 'Nama Aset',
        placeholder: 'Contoh: Freezer Laboratorium',
      },
      {
        key: 'amount',
        label: 'Jumlah',
        type: 'number',
        min: 1,
        step: 1,
        placeholder: 'Contoh: 2',
        renderValue: (row) => String(row.amount ?? ''),
      },
      {
        key: 'price_per_unit',
        label: 'Harga Satuan',
        type: 'decimal',
        placeholder: 'Contoh: 75.000.000',
        renderValue: (row) => formatCapitalIdr(Number(row.price_per_unit)),
      },
    ],
    [availableCompanies, companyOptions, defaultCompanyId, todayDate]
  );

  const computedColumns = useMemo<
    CrudComputedColumnConfig<CompanyAsset>[]
  >(
    () => [
      {
        key: 'total_price',
        label: 'Total Harga',
        render: (row) => formatCapitalIdr(Number(row.total_price)),
        filterText: (row) => formatCapitalIdr(Number(row.total_price)),
      },
    ],
    []
  );

  const totalAssetValue = useMemo(
    () =>
      allAssets.reduce(
        (sum, asset) => sum + (Number(asset.total_price) || 0),
        0
      ),
    [allAssets]
  );

  const buildInput = (values: Record<string, string>) => {
    const companyId = parseInt(values.company_id ?? '', 10);
    const assetDate = (values.asset_date ?? '').trim();
    const name = (values.name ?? '').trim();
    const amount = Number(values.amount ?? '');
    const pricePerUnit = parseFloat(values.price_per_unit ?? '');
    if (!Number.isFinite(companyId) || !assetDate || !name) {
      return null;
    }
    if (!Number.isInteger(amount) || amount < 1) {
      return null;
    }
    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      return null;
    }
    return { companyId, assetDate, name, amount, pricePerUnit };
  };

  return (
    <CrudModal
      resetKey={`company-asset-${company?.id ?? 0}`}
      isOpen={isOpen}
      title="Master Aset"
      subtitle="Kelola data aset perusahaan pada modul CFO"
      testId="company-asset-crud-modal"
      layout="split"
      labelPlacement="left"
      modalSize="expanded"
      fields={fields}
      computedColumns={computedColumns}
      summary={
        <SummaryBanner
          label="Total Nilai Aset"
          value={formatCapitalIdr(totalAssetValue)}
          testId="company-asset-total-banner"
        />
      }
      emptyMessage="Belum ada data aset perusahaan."
      pageSize={10}
      items={allAssets}
      loading={loading}
      error={error}
      onClose={onClose}
      onCreate={async (values) => {
        const input = buildInput(values);
        if (input) {
          await createAsset(input);
        }
      }}
      onUpdate={async (id, values) => {
        const input = buildInput(values);
        if (input) {
          await updateAsset(id, input);
        }
      }}
      onDelete={async (id) => {
        await removeAsset(id);
      }}
    />
  );
};
