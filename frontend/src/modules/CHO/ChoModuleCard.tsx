import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import {
  CascadingHorizontalMenu,
  type HorizontalMenuItem,
  ModuleLauncherCard,
} from '../../components/ui';

export const CHO_INPUT_SDM_ITEMS: HorizontalMenuItem[] = [
  { code: 'MASTER_KARYAWAN', title: 'Master Karyawan' },
  { code: 'INPUT_KARYAWAN', title: 'Input Karyawan' },
  { code: 'VIEW_KARYAWAN', title: 'View Karyawan' },
];

export const CHO_MENU_ITEMS: HorizontalMenuItem[] = [
  {
    code: 'INPUT_SDM',
    title: 'Input SDM',
    children: CHO_INPUT_SDM_ITEMS,
  },
];

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

interface ChoHorizontalMenuProps {
  selectedCode?: string | null;
  selectedChildCode?: string | null;
  onSelect?: (item: HorizontalMenuItem) => void;
  onSelectChild?: (item: HorizontalMenuItem) => void;
}

export const ChoHorizontalMenu: React.FC<ChoHorizontalMenuProps> = ({
  selectedCode,
  selectedChildCode,
  onSelect,
  onSelectChild,
}) => {
  return (
    <CascadingHorizontalMenu
      items={CHO_MENU_ITEMS}
      accent="cho"
      selectedCode={selectedCode}
      selectedChildCode={selectedChildCode}
      ariaLabel="CHO Submenu"
      testId="cho-horizontal-menu"
      onSelect={onSelect}
      onSelectChild={onSelectChild}
    />
  );
};
