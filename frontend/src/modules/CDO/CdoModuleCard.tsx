import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import { ModuleLauncherCard } from '../../components/ui/ModuleLauncherCard';
import type { HorizontalMenuItem } from '../../components/ui/HorizontalMenuCard';

export const CDO_MENU_ITEMS: HorizontalMenuItem[] = [
  { code: 'OVERVIEW', title: 'Overview' },
];

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
      accent="cdo"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};
