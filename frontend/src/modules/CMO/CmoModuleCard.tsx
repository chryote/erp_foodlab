import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import { ModuleLauncherCard } from '../../components/ui/ModuleLauncherCard';

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
      accent="cmo"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};
