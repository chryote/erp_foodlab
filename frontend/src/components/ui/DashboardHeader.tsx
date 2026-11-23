import React, { useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import type {
  AuthUser,
  Company,
  ErpModuleCode,
  ErpModuleOverview,
} from '@/api/client';
import { Button } from './Button';
import { ConfirmDialog } from './Modal';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from './shadcn/menubar';
import type { HorizontalMenuItem } from './HorizontalMenuCard';
import { DEFAULT_CFO_MODULE } from '@/modules/CFO/CfoModuleCard';
import { DEFAULT_CHO_MODULE } from '@/modules/CHO/ChoModuleCard';
import { DEFAULT_CPO_MODULE } from '@/modules/CPO/CpoModuleCard';
import { DEFAULT_CDO_MODULE } from '@/modules/CDO/CdoModuleCard';
import { DEFAULT_CMO_MODULE } from '@/modules/CMO/CmoModuleCard';

const COMPANY_MENU_ITEMS: HorizontalMenuItem[] = [
  {
    code: 'INPUT_MODAL',
    title: 'Input Modal',
    children: [
      { code: 'PERUSAHAAN', title: 'Master Modal' },
      { code: 'DAFTAR_KAPITAL_PERUSAHAAN', title: 'View Modal' },
    ],
  },
  {
    code: 'INPUT_OPERASIONAL',
    title: 'Input Operasional',
    children: [
      { code: 'MASTER_OPERASIONAL', title: 'Master Modal' },
      { code: 'VIEW_OPERASIONAL', title: 'View Modal' },
    ],
  },
  {
    code: 'INPUT_ASET',
    title: 'Input Aset',
    children: [
      { code: 'MASTER_ASET', title: 'Master Modal' },
      { code: 'VIEW_ASET', title: 'View Modal' },
    ],
  },
  {
    code: 'LABA_RUGI',
    title: 'Laba Rugi',
    children: [
      { code: 'LABA_RUGI', title: 'Master Modal' },
      { code: 'LABA_RUGI', title: 'View Modal' },
    ],
  },
  {
    code: 'NERACA',
    title: 'Neraca',
    children: [
      { code: 'NERACA', title: 'Master Modal' },
      { code: 'NERACA', title: 'View Modal' },
    ],
  },
];

const COMPANY_MENU_MODULES: Array<{
  code: ErpModuleCode;
  fallback: ErpModuleOverview;
  items: HorizontalMenuItem[];
}> = [
  { code: 'CFO', fallback: DEFAULT_CFO_MODULE, items: COMPANY_MENU_ITEMS },
  { code: 'CHO', fallback: DEFAULT_CHO_MODULE, items: COMPANY_MENU_ITEMS },
  { code: 'CPO', fallback: DEFAULT_CPO_MODULE, items: COMPANY_MENU_ITEMS },
  { code: 'CDO', fallback: DEFAULT_CDO_MODULE, items: COMPANY_MENU_ITEMS },
  { code: 'CMO', fallback: DEFAULT_CMO_MODULE, items: COMPANY_MENU_ITEMS },
];

export interface DashboardHeaderProps {
  companies: Company[];
  selectedSeries?: number;
  selectedCompanyId?: number | null;
  user?: AuthUser | null;
  userLoading?: boolean;
  modulesMap?: Partial<Record<ErpModuleCode, ErpModuleOverview>>;
  selectedModuleCode?: ErpModuleCode | null;
  selectedSubMenuCode?: string | null;
  selectedChildSubMenuCode?: string | null;
  onSelectSeries?: (series: number) => void;
  onSelectCompany?: (company: Company) => void;
  onSelectModule?: (module: ErpModuleOverview) => void;
  onSelectSubMenu?: (item: HorizontalMenuItem) => void;
  onSelectChildSubMenu?: (item: HorizontalMenuItem) => void;
  onLogout?: () => void | Promise<void>;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  companies,
  selectedSeries,
  selectedCompanyId,
  user,
  userLoading = false,
  modulesMap = {},
  selectedModuleCode = null,
  selectedSubMenuCode = null,
  selectedChildSubMenuCode = null,
  onSelectSeries,
  onSelectCompany,
  onSelectModule,
  onSelectSubMenu,
  onSelectChildSubMenu,
  onLogout,
}) => {
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const seriesList = useMemo(
    () =>
      Array.from(new Set(companies.map((company) => company.series ?? 1))).sort(
        (firstList, secondList) => firstList - secondList
      ),
    [companies]
  );
  const activeSeries =
    selectedSeries !== undefined && seriesList.includes(selectedSeries)
      ? selectedSeries
      : (seriesList[0] ?? 1);
  const companiesInActiveSeries = companies.filter(
    (company) => (company.series ?? 1) === activeSeries
  );

  const handleConfirmLogout = async () => {
    if (!onLogout) {
      return;
    }

    setLogoutLoading(true);
    try {
      await onLogout();
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmationOpen(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-background shadow-sm">
      <nav className="mx-auto max-w-340 px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-14 items-center gap-4 border-b border-border">
          <div className="flex shrink-0 items-center gap-2.5">
            <span
              role="img"
              aria-label="FoodLab logo"
              className="grid h-full place-items-center rounded-lg"
            >
              <img
                src="/black-logo.png"
                alt=""
                aria-hidden="true"
                width={64}
                height={64}
                className="dashboard-header-logo dashboard-header-logo--light"
              />
              <img
                src="/white-logo.png"
                alt=""
                aria-hidden="true"
                width={64}
                height={64}
                className="dashboard-header-logo dashboard-header-logo--dark"
              />
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Company series"
            className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto self-stretch"
          >
            {seriesList.map((series) => {
              const isSelected = series === activeSeries;
              return (
                <button
                  key={series}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`dashboard-series-tab-${series}`}
                  onClick={() => onSelectSeries?.(series)}
                  className={cn(
                    'relative shrink-0 px-3 text-xs font-semibold transition-colors sm:px-4',
                    isSelected
                      ? 'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary'
                      : ''
                  )}
                >
                  {`Seri ${series}`}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <span
                aria-label={`Signed in as ${user.name}, ${user.email}`}
                className="hidden max-w-48 sm:block"
              >
                <span className="block truncate text-xs font-medium text-foreground">
                  Hi, <span>{user.name}</span>
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {user.email}
                </span>
              </span>
            ) : userLoading ? (
              <span
                role="status"
                className="hidden text-xs text-muted-foreground sm:block"
              >
                Memuat pengguna...
              </span>
            ) : null}
            {onLogout && (
              <Button
                variant="secondary"
                aria-label="Keluar"
                onClick={() => setLogoutConfirmationOpen(true)}
                className="size-9 px-0"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex min-h-12 items-center justify-between gap-3">
          <Menubar
            aria-label="Companies"
            className="flex h-auto min-h-12 min-w-0 flex-1 justify-start gap-1 overflow-x-auto rounded-none border-0 bg-transparent p-0 shadow-none"
          >
            {companiesInActiveSeries.map((company) => {
              const isSelected = selectedCompanyId === company.id;
              return (
                <MenubarMenu key={company.id}>
                  <MenubarTrigger
                    aria-selected={isSelected}
                    aria-current={isSelected ? 'page' : undefined}
                    data-testid={`dashboard-company-tab-${company.id}`}
                    className={cn(
                      'relative h-12 shrink-0 rounded-none px-3 text-xs font-semibold transition-colors sm:px-4',
                      isSelected
                        ? 'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary'
                        : ''
                    )}
                  >
                    {company.name}
                  </MenubarTrigger>
                  <MenubarContent>
                    {COMPANY_MENU_MODULES.map((moduleConfig) => {
                      const module =
                        modulesMap[moduleConfig.code] ?? moduleConfig.fallback;

                      return (
                        <MenubarSub key={moduleConfig.code}>
                          <MenubarSubTrigger
                            aria-current={
                              selectedModuleCode === moduleConfig.code
                                ? 'page'
                                : undefined
                            }
                          >
                            {moduleConfig.code}
                          </MenubarSubTrigger>
                          <MenubarSubContent>
                            {moduleConfig.items.map((menuItem) => (
                              <MenubarSub key={menuItem.code}>
                                <MenubarSubTrigger
                                  aria-current={
                                    selectedSubMenuCode === menuItem.code
                                      ? 'page'
                                      : undefined
                                  }
                                >
                                  {menuItem.title}
                                </MenubarSubTrigger>
                                <MenubarSubContent>
                                  {menuItem.children?.map((childItem, index) => (
                                    <MenubarItem
                                      key={`${childItem.code}-${index}`}
                                      aria-current={
                                        selectedChildSubMenuCode === childItem.code
                                          ? 'page'
                                          : undefined
                                      }
                                      onSelect={() => {
                                        onSelectCompany?.(company);
                                        onSelectModule?.(module);
                                        onSelectSubMenu?.(menuItem);
                                        onSelectChildSubMenu?.(childItem);
                                      }}
                                    >
                                      {childItem.title}
                                    </MenubarItem>
                                  ))}
                                </MenubarSubContent>
                              </MenubarSub>
                            ))}
                          </MenubarSubContent>
                        </MenubarSub>
                      );
                    })}
                  </MenubarContent>
                </MenubarMenu>
              );
            })}
          </Menubar>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle showLabel />
          </div>
        </div>
      </nav>
    </header>
    <ConfirmDialog
      isOpen={logoutConfirmationOpen}
      title="Konfirmasi keluar"
      message="Anda yakin ingin keluar dari aplikasi?"
      confirmLabel={logoutLoading ? 'Keluar...' : 'Ya, keluar'}
      cancelLabel="Batal"
      loading={logoutLoading}
      testId="logout-confirm-dialog"
      onConfirm={handleConfirmLogout}
      onCancel={() => setLogoutConfirmationOpen(false)}
    />
    </>
  );
};
