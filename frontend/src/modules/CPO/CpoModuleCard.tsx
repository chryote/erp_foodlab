import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import { ModuleLauncherCard } from '../../components/ui';

export const DEFAULT_CPO_MODULE: ErpModuleOverview = {
  code: 'CPO',
  title: 'CPO (Persediaan Barang Dagang)',
  subtitle: 'Kontrol Stok Gudang, Batch Bahan Pangan, Reagen Lab & Cold Storage',
  status: 'active',
  primary_kpi: {
    label: 'Total SKU Tersedia',
    value: '1.284 SKU',
    trend: '99.2% Akurasi Stok',
  },
  highlights: [
    { label: 'Nilai Persediaan Gudang', value: 'Rp 890.000.000' },
    { label: 'Batch Lulus Uji QC', value: '312 Batch' },
    { label: 'Peringatan Reorder (ROP)', value: '4 Item' },
  ],
  recent_items: [
    { id: 'STK-CPO-201', name: 'Susu Segar Pasteurisasi Batch A12', status: 'In Stock' },
    { id: 'STK-CPO-202', name: 'Minyak Zaitun Cold-Pressed 500ml', status: 'In Stock' },
  ],
};

const CpoIcon = (
  <svg
    viewBox="0 0 24 24"
    width="40"
    height="40"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

interface CpoModuleCardProps {
  data?: ErpModuleOverview;
  isSelected?: boolean;
  onSelect?: (module: ErpModuleOverview) => void;
}

export const CpoModuleCard: React.FC<CpoModuleCardProps> = ({
  data = DEFAULT_CPO_MODULE,
  isSelected = false,
  onSelect,
}) => {
  return (
    <ModuleLauncherCard
      code={data.code}
      title={data.title}
      icon={CpoIcon}
      accent="cpo"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};
