import React from 'react';
import type { ErpModuleOverview } from '../../api/client';
import {
  CascadingHorizontalMenu,
  type HorizontalMenuItem,
} from '../../components/ui/HorizontalMenuCard';
import { ModuleLauncherCard } from '../../components/ui/ModuleLauncherCard';

export const CPO_INPUT_PACKING_ITEMS: HorizontalMenuItem[] = [
  { code: 'MASTER_PACKING', title: 'Master Packing' },
  { code: 'VIEW_PACKING', title: 'View Packing' },
];

export const CPO_INPUT_PAKET_ITEMS: HorizontalMenuItem[] = [
  { code: 'MASTER_PAKET', title: 'Master Paket' },
  { code: 'MASTER_BAHAN_BAKU', title: 'Master Bahan Baku' },
  { code: 'VIEW_BAHAN_BAKU', title: 'View Bahan Baku' },
];

export const CPO_INPUT_ITEM_VENDOR_ITEMS: HorizontalMenuItem[] = [
  { code: 'MASTER_ITEM_VENDOR', title: 'Master Item Vendor' },
];

export const CPO_MENU_ITEMS: HorizontalMenuItem[] = [
  {
    code: 'INPUT_ITEM_VENDOR',
    title: 'Input Item vendor',
    children: CPO_INPUT_ITEM_VENDOR_ITEMS,
  },
  {
    code: 'INPUT_PACKING',
    title: 'Input Packing',
    children: CPO_INPUT_PACKING_ITEMS,
  },
  {
    code: 'INPUT_PAKET',
    title: 'Input Paket',
    children: CPO_INPUT_PAKET_ITEMS,
  }
];

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

interface CpoHorizontalMenuProps {
  selectedCode?: string | null;
  selectedChildCode?: string | null;
  onSelect?: (item: HorizontalMenuItem) => void;
  onSelectChild?: (item: HorizontalMenuItem) => void;
}

export const CpoHorizontalMenu: React.FC<CpoHorizontalMenuProps> = ({
  selectedCode,
  selectedChildCode,
  onSelect,
  onSelectChild,
}) => {
  return (
    <CascadingHorizontalMenu
      items={CPO_MENU_ITEMS}
      accent="cpo"
      selectedCode={selectedCode}
      selectedChildCode={selectedChildCode}
      ariaLabel="CPO Submenu"
      testId="cpo-horizontal-menu"
      onSelect={onSelect}
      onSelectChild={onSelectChild}
    />
  );
};
