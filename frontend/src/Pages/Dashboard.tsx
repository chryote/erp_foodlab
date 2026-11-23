import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchCurrentUser,
  type AuthUser,
  type Company,
  type ErpModuleOverview,
} from '@/api/client';
import {
  DashboardHeader,
  type HorizontalMenuItem,
} from '@/components/ui';
import {
  useCompanyAssetCrudResource,
  useCapitalOverviewResource,
  useErpModulesQuery,
  useMasterOperasionalCrudResource,
} from '@/lib/cfoResources';
import { ExpenseItemCrudModal } from '@/modules/CFO/ExpenseItemCrudModal';

export interface DashboardProps {
  onLogout?: () => void | Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null
  );
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

  const selectedCompany =
    companies.find((company) => company.id === selectedCompanyId) ??
    companies[0] ??
    null;

  const {
    error: operationsError,
  } = useMasterOperasionalCrudResource(Boolean(selectedCompany), selectedCompany);
  const {
    error: assetError,
  } = useCompanyAssetCrudResource(Boolean(selectedCompany), selectedCompany);

  const handleSelectSeries = (series: number) => {
    const firstCompanyInSeries = companies.find(
      (company) => (company.series ?? 1) === series
    );
    setSelectedCompanyId(firstCompanyInSeries?.id ?? null);
    setSelectedModule(null);
    setSelectedSubMenu(null);
    setSelectedChildSubMenu(null);
  };

  const handleSelectCompany = (company: Company) => {
    if (selectedCompanyId !== company.id) {
      setSelectedModule(null);
      setSelectedSubMenu(null);
      setSelectedChildSubMenu(null);
    }
    setSelectedCompanyId(company.id);
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
    modulesError,
    capitalError,
    operationsError,
    assetError,
  ].filter((message): message is string => Boolean(message));


  const activeModule = selectedModule
    ? modulesMap[selectedModule.code] ?? selectedModule
    : null;
  const activeContentTitle =
    selectedChildSubMenu?.title ?? selectedSubMenu?.title ?? 'Ringkasan';

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        companies={companies}
        selectedSeries={selectedCompany?.series ?? 1}
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
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-340 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            {activeModule ? activeModule.code : 'Dashboard'}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {activeModule ? activeContentTitle : 'PT. Slaras Nusa Foodlab'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedCompany
              ? `Ringkasan keuangan dan operasional untuk ${selectedCompany.name}.`
              : 'Pilih perusahaan untuk melihat ringkasan keuangan dan operasional.'}
          </p>
        </div>

        {errors.map((message) => (
          <div
            key={message}
            role="alert"
            className="mb-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary"
          >
            {message}
          </div>
        ))}

        {!capitalLoading && companies.length === 0 && (
          <div className="mb-6 rounded-xl border border-dashed border-border bg-card px-5 py-6 text-sm text-muted-foreground">
            Belum ada data perusahaan. Tambahkan perusahaan untuk mulai melihat
            ringkasan operasional.
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
