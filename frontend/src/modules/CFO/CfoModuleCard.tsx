import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import { ModuleLauncherCard } from '../../components/ui';

export const DEFAULT_CFO_MODULE: ErpModuleOverview = {
  code: 'CFO',
  title: 'CFO (Keuangan)',
  subtitle: 'Manajemen Keuangan, Arus Kas, Buku Besar & Anggaran',
  status: 'active',
  primary_kpi: {
    label: 'Kas & Setara Kas Bulan Ini',
    value: 'Rp 1.450.000.000',
    trend: '+12.4%',
  },
  highlights: [
    { label: 'Piutang Usaha (AR)', value: 'Rp 320.500.000' },
    { label: 'Utang Dagang (AP)', value: 'Rp 185.000.000' },
    { label: 'Margin Laba Bersih', value: '21.8%' },
  ],
  recent_items: [
    { id: 'INV-CFO-001', name: 'Jurnal Penutupan Bulanan FoodLab', status: 'Verified' },
    { id: 'INV-CFO-002', name: 'Pembayaran Bahan Baku Dairy', status: 'Paid' },
  ],
};

const CfoIcon = (
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
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <path d="M7 15h.01" />
    <path d="M11 15h2" />
  </svg>
);

interface CfoModuleCardProps {
  data?: ErpModuleOverview;
  isSelected?: boolean;
  onSelect?: (module: ErpModuleOverview) => void;
}

export const CfoModuleCard: React.FC<CfoModuleCardProps> = ({
  data = DEFAULT_CFO_MODULE,
  isSelected = false,
  onSelect,
}) => {
  return (
    <ModuleLauncherCard
      code={data.code}
      title={data.title}
      icon={CfoIcon}
      accent="cfo"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};
