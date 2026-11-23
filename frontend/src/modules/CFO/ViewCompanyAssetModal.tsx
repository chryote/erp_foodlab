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

export interface ViewCompanyAssetModalProps {
  isOpen: boolean;
  company: Company | null;
  onClose: () => void;
}

export const ViewCompanyAssetModal: React.FC<
  ViewCompanyAssetModalProps
> = ({ isOpen, company, onClose }) => {
  const { assets, loading, error } = useCompanyAssetCrudResource(
    isOpen,
    company
  );

  const totalAssetValue = useMemo(
    () =>
      assets.reduce(
        (sum, asset) => sum + (Number(asset.total_price) || 0),
        0
      ),
    [assets]
  );

  const fields = useMemo<CrudFieldConfig<CompanyAsset>[]>(
    () => [
      {
        key: 'asset_date',
        label: 'Tanggal Aset',
        renderValue: (row) => row.asset_date ?? '-',
      },
      {
        key: 'name',
        label: 'Nama Aset',
      },
      {
        key: 'amount',
        label: 'Jumlah',
        renderValue: (row) => String(row.amount ?? ''),
      },
      {
        key: 'price_per_unit',
        label: 'Harga Satuan',
        renderValue: (row) => formatCapitalIdr(Number(row.price_per_unit)),
      },
    ],
    []
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

  return (
    <CrudModal
      isOpen={isOpen}
      title="View Aset"
      subtitle={
        company
          ? `Ringkasan nilai aset untuk ${company.name}`
          : 'Ringkasan nilai aset perusahaan pada modul CFO'
      }
      testId="view-aset-modal"
      layout="split"
      modalSize="expanded"
      fields={fields}
      computedColumns={computedColumns}
      summary={
        <SummaryBanner
          label="Total Nilai Aset"
          value={formatCapitalIdr(totalAssetValue)}
          testId="view-aset-total-banner"
        />
      }
      emptyMessage="Belum ada data aset perusahaan."
      pageSize={10}
      items={assets}
      loading={loading}
      error={error}
      readOnly={true}
      onClose={onClose}
    />
  );
};
