import React, { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  fetchCurrentUser,
  syncActiveCompany,
  type AuthUser,
  type Company,
  type ErpModuleOverview,
} from '@/api/client';
import {
  DashboardHeader,
  type HorizontalMenuItem,
} from '@/components/ui';
import { setActiveCompanyId } from '@/lib/activeCompanyStorage';
import {
  useCompanyAssetCrudResource,
  useCapitalOverviewResource,
  useErpModulesQuery,
  useMasterOperasionalCrudResource,
} from '@/lib/cfoResources';
import { ExpenseItemCrudModal } from '@/modules/CFO/ExpenseItemCrudModal';
import {
  getDashboardMenuCompanyId,
  getDashboardMenuPage,
  getDashboardMenuRoute,
} from '@/pages/menuPages';
import { useTheme } from '@/lib/theme';

export interface DashboardProps {
  onLogout?: () => void | Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const routeCompanyId = getDashboardMenuCompanyId(location.pathname);
  const isMenuRoute = location.pathname.startsWith('/dashboard/company/');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    routeCompanyId
  );
  const [selectedSeries, setSelectedSeries] = useState<number | null>(null);
  const [activeCompanySyncError, setActiveCompanySyncError] = useState<
    string | null
  >(null);
  const [selectedModule, setSelectedModule] =
    useState<ErpModuleOverview | null>(null);
  const [selectedSubMenu, setSelectedSubMenu] =
    useState<HorizontalMenuItem | null>(null);
  const [selectedChildSubMenu, setSelectedChildSubMenu] =
    useState<HorizontalMenuItem | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const { modulesMap, error: modulesError } = useErpModulesQuery();
  const currentUserQuery = useQuery<AuthUser>({
    queryKey: ['auth', 'current-user'],
    queryFn: async () => {
      const response = await fetchCurrentUser();
      return response.data;
    },
  });
  const {
    companies,
    loading: capitalLoading,
    error: capitalError,
  } = useCapitalOverviewResource(true);

  const activeCompanyId = routeCompanyId ?? selectedCompanyId;
  const selectedCompany =
    companies.find((company) => company.id === activeCompanyId) ??
    (activeCompanyId === null ? companies[0] : null) ??
    null;

  const syncCompany = useCallback(async (companyId: number | null) => {
    try {
      await syncActiveCompany(companyId);
      setActiveCompanySyncError(null);
    } catch (error) {
      setActiveCompanySyncError(
        error instanceof Error
          ? error.message
          : 'Gagal menyinkronkan perusahaan aktif.'
      );
    }
  }, []);

  useEffect(() => {
    setActiveCompanyId(selectedCompany?.id ?? null);
    if (
      routeCompanyId !== null &&
      selectedCompany?.id === routeCompanyId
    ) {
      setSelectedSeries(selectedCompany.series ?? 1);
      void syncCompany(routeCompanyId);
    }
  }, [routeCompanyId, selectedCompany?.id, selectedCompany?.series, syncCompany]);

  const {
    error: operationsError,
  } = useMasterOperasionalCrudResource(Boolean(selectedCompany), selectedCompany);
  const {
    error: assetError,
  } = useCompanyAssetCrudResource(Boolean(selectedCompany), selectedCompany);

  const handleSelectSeries = (series: number) => {
    setSelectedSeries(series);
  };

  const handleSelectCompany = (company: Company) => {
    if (selectedCompanyId !== company.id) {
      setSelectedModule(null);
      setSelectedSubMenu(null);
      setSelectedChildSubMenu(null);
    }
    setSelectedCompanyId(company.id);
    setSelectedSeries(company.series ?? 1);
    setActiveCompanyId(company.id);
  };

  const handleSelectModule = (module: ErpModuleOverview) => {
    if (selectedModule?.code !== module.code) {
      setSelectedSubMenu(null);
      setSelectedChildSubMenu(null);
    }
    setSelectedModule(module);
  };

  const handleSelectSubMenu = (item: HorizontalMenuItem) => {
    if (selectedSubMenu?.code !== item.code) {
      setSelectedChildSubMenu(null);
    }
    setSelectedSubMenu(item);
  };

  const handleSelectChildSubMenu = (item: HorizontalMenuItem) => {
    setSelectedChildSubMenu(item);
  };

  const userError = currentUserQuery.error
    ? currentUserQuery.error instanceof Error
      ? currentUserQuery.error.message
      : 'Gagal memuat data pengguna.'
    : null;
  const errors = [
    userError,
    activeCompanySyncError,
    modulesError,
    capitalError,
    operationsError,
    assetError,
  ].filter((message): message is string => Boolean(message));

  const MenuPage = getDashboardMenuPage(location.pathname);
  const routeCompanyDoesNotExist =
    routeCompanyId !== null &&
    !capitalLoading &&
    !companies.some((company) => company.id === routeCompanyId);

  if (isMenuRoute && (!MenuPage || routeCompanyDoesNotExist)) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        companies={companies}
        selectedSeries={selectedSeries ?? selectedCompany?.series ?? 1}
        selectedCompanyId={selectedCompany?.id ?? null}
        user={currentUserQuery.data}
        userLoading={currentUserQuery.isLoading}
        modulesMap={modulesMap}
        selectedModuleCode={selectedModule?.code ?? null}
        selectedSubMenuCode={selectedSubMenu?.code ?? null}
        selectedChildSubMenuCode={selectedChildSubMenu?.code ?? null}
        onSelectSeries={handleSelectSeries}
        onSelectCompany={handleSelectCompany}
        onSelectModule={handleSelectModule}
        onSelectSubMenu={handleSelectSubMenu}
        onSelectChildSubMenu={handleSelectChildSubMenu}
        onSelectItem={(company, moduleCode, menuItem, childItem) => {
          navigate(
            getDashboardMenuRoute(
              company.id,
              moduleCode,
              menuItem,
              childItem
            )
          );
        }}
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-340 px-4 py-7 sm:px-6 lg:px-8">
        {errors.map((message) => (
          <div
            key={message}
            role="alert"
            className="mb-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
          >
            {message}
          </div>
        ))}
        {MenuPage ? (
          <MenuPage />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card/50 p-6 text-center">
            <img src={theme === 'dark' ? '/white-logo.png' : '/black-logo.png'}
              alt="Dashboard Illustration"
              className="mx-auto max-h-96 opacity-30"
            />
            <p className="text-sm text-muted-foreground" />
          </div>
        )}
      </main>

      <ExpenseItemCrudModal
        isOpen={expenseModalOpen}
        company={selectedCompany}
        companies={companies}
        onClose={() => setExpenseModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
