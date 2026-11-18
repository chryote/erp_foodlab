import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import { ModuleLauncherCard } from '../../components/ui';

export const DEFAULT_CMO_MODULE: ErpModuleOverview = {
  code: 'CMO',
  title: 'CMO (Penjualan)',
  subtitle: 'Pesanan Penjualan (Sales Order), Distribusi Ritel, Kontrak & Target Omzet',
  status: 'active',
  primary_kpi: {
    label: 'Total Penjualan Bulan Ini',
    value: 'Rp 2.180.000.000',
    trend: '104.2% dari Target',
  },
  highlights: [
    { label: 'Sales Order Selesai', value: '486 Pesanan' },
    { label: 'Mitra Distributor Aktif', value: '94 Mitra' },
    { label: 'Tingkat Pengiriman Tepat Waktu', value: '97.8%' },
  ],
  recent_items: [
    { id: 'SO-CMO-401', name: 'PO Distributor Ritel Jabodetabek', status: 'Delivered' },
    { id: 'SO-CMO-402', name: 'Kontrak Suplai Hotel & Restoran Bintang 5', status: 'Processing' },
  ],
};

const CmoIcon = (
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
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

interface CmoModuleCardProps {
  data?: ErpModuleOverview;
  isSelected?: boolean;
  onSelect?: (module: ErpModuleOverview) => void;
}

export const CmoModuleCard: React.FC<CmoModuleCardProps> = ({
  data = DEFAULT_CMO_MODULE,
  isSelected = false,
  onSelect,
}) => {
  return (
    <ModuleLauncherCard
      code={data.code}
      title={data.title}
      icon={CmoIcon}
      accent="cmo"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};
