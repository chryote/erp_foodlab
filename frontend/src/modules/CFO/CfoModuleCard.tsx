import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import {
  CascadingHorizontalMenu,
  type HorizontalMenuItem,
  ModuleLauncherCard,
} from '../../components/ui';

export const CFO_INPUT_MODAL_ITEMS: HorizontalMenuItem[] = [
  { code: 'PERUSAHAAN', title: 'Master Modal' },
  { code: 'DAFTAR_KAPITAL_PERUSAHAAN', title: 'View Modal' },
];

export const CFO_INPUT_OPERASIONAL_ITEMS: HorizontalMenuItem[] = [
  { code: 'MASTER_OPERASIONAL', title: 'Master Operasional' },
  { code: 'ITEM_OPERASIONAL', title: 'Item Operasional' },
  { code: 'VIEW_OPERASIONAL', title: 'View Operasional' },
];

export const CFO_INPUT_ASET_ITEMS: HorizontalMenuItem[] = [
  { code: 'MASTER_ASET', title: 'Master Aset' },
  { code: 'VIEW_ASET', title: 'View Aset' },
];

export const CFO_MENU_ITEMS: HorizontalMenuItem[] = [
  {
    code: 'INPUT_MODAL',
    title: 'Input Modal',
    children: CFO_INPUT_MODAL_ITEMS,
  },
  {
    code: 'INPUT_OPERASIONAL',
    title: 'Input Operasional',
    children: CFO_INPUT_OPERASIONAL_ITEMS,
  },
  {
    code: 'INPUT_ASET',
    title: 'Input Aset',
    children: CFO_INPUT_ASET_ITEMS,
  },
  { code: 'LABA_RUGI', title: 'Laba Rugi' },
  { code: 'NERACA', title: 'Neraca' },
];

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
      accent="cfo"
      isSelected={isSelected}
      onClick={() => onSelect?.(data)}
    />
  );
};

interface CfoHorizontalMenuProps {
  selectedCode?: string | null;
  selectedChildCode?: string | null;
  onSelect?: (item: HorizontalMenuItem) => void;
  onSelectChild?: (item: HorizontalMenuItem) => void;
}

export const CfoHorizontalMenu: React.FC<CfoHorizontalMenuProps> = ({
  selectedCode,
  selectedChildCode,
  onSelect,
  onSelectChild,
}) => {
  return (
    <CascadingHorizontalMenu
      items={CFO_MENU_ITEMS}
      accent="cfo"
      selectedCode={selectedCode}
      selectedChildCode={selectedChildCode}
      ariaLabel="CFO Submenu"
      testId="cfo-horizontal-menu"
      onSelect={onSelect}
      onSelectChild={onSelectChild}
    />
  );
};
