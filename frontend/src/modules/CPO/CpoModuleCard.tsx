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
      accent="cpo"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};
