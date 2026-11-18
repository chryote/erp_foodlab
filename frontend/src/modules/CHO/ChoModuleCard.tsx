import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import { ModuleLauncherCard } from '../../components/ui';

export const DEFAULT_CHO_MODULE: ErpModuleOverview = {
  code: 'CHO',
  title: 'CHO (SDM)',
  subtitle: 'Sumber Daya Manusia, Kehadiran, Payroll & KPI Analis Lab',
  status: 'active',
  primary_kpi: {
    label: 'Total Karyawan Aktif',
    value: '148 Personel',
    trend: '98.6% Hadir',
  },
  highlights: [
    { label: 'Analis Laboratorium', value: '42 Staf' },
    { label: 'Operator Produksi & QC', value: '76 Staf' },
    { label: 'Pelatihan ISO 17025', value: '100% Lulus' },
  ],
  recent_items: [
    { id: 'HR-CHO-101', name: 'Sertifikasi Analis Mikrobiologi Pangan', status: 'Completed' },
    { id: 'HR-CHO-102', name: 'Rekrutmen Supervisor Quality Assurance', status: 'Interview' },
  ],
};

interface ChoModuleCardProps {
  data?: ErpModuleOverview;
  isSelected?: boolean;
  onSelect?: (module: ErpModuleOverview) => void;
}

export const ChoModuleCard: React.FC<ChoModuleCardProps> = ({
  data = DEFAULT_CHO_MODULE,
  isSelected = false,
  onSelect,
}) => {
  return (
    <ModuleLauncherCard
      code={data.code}
      title={data.title}
      accent="cho"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};
