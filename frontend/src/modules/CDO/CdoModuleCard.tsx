import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import { ModuleLauncherCard } from '../../components/ui';

export const DEFAULT_CDO_MODULE: ErpModuleOverview = {
  code: 'CDO',
  title: 'CDO (Pemasaran)',
  subtitle: 'Kampanye Digital, Akuisisi Mitra B2B, Branding & Analitik Pasar',
  status: 'active',
  primary_kpi: {
    label: 'Prospek B2B Baru Bulan Ini',
    value: '340 Leads',
    trend: '+18.5% ROAS',
  },
  highlights: [
    { label: 'Kampanye Aktif', value: '12 Kampanye' },
    { label: 'Konversi MQL ke SQL', value: '28.4%' },
    { label: 'Biaya Akuisisi (CAC)', value: 'Rp 420.000' },
  ],
  recent_items: [
    { id: 'MKT-CDO-301', name: 'Pameran Pangan Sehat & Sertifikasi Halal', status: 'Running' },
    { id: 'MKT-CDO-302', name: 'Kampanye Katalog Produk Organik Q4', status: 'Running' },
  ],
};

const CdoIcon = (
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
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

interface CdoModuleCardProps {
  data?: ErpModuleOverview;
  isSelected?: boolean;
  onSelect?: (module: ErpModuleOverview) => void;
}

export const CdoModuleCard: React.FC<CdoModuleCardProps> = ({
  data = DEFAULT_CDO_MODULE,
  isSelected = false,
  onSelect,
}) => {
  return (
    <ModuleLauncherCard
      code={data.code}
      title={data.title}
      icon={CdoIcon}
      accent="cdo"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};
