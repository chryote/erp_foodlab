import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchErpModules,
  type Company,
  type ErpModuleCode,
  type ErpModuleOverview,
} from '@/api/client';
import {
  type HorizontalMenuItem,
  PageHeader,
} from '@/components/ui';
import {
  type ErpDashboardPageProps,
  useCompanyCrudResource,
} from '@/lib/inertia';
import { CdoModuleCard } from '@/modules/CDO/CdoModuleCard';
import { CapitalCompanyCrudModal } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  CfoHorizontalMenu,
  CfoModuleCard,
} from '@/modules/CFO/CfoModuleCard';
import { CompanyCrudModal } from '@/modules/CFO/CompanyCrudModal';
import { MasterOperasionalCrudModal } from '@/modules/CFO/MasterOperasionalCrudModal';
import { ViewOperasionalModal } from '@/modules/CFO/ViewOperasionalModal';
import { ChoModuleCard } from '@/modules/CHO/ChoModuleCard';
import { CmoModuleCard } from '@/modules/CMO/CmoModuleCard';
import { CpoModuleCard } from '@/modules/CPO/CpoModuleCard';
import '@/App.css';

export const Dashboard: React.FC<ErpDashboardPageProps> = ({
  modules: initialModules,
  companies: initialCompanies,
  capitalCompanies: initialCapitalCompanies,
  expenseCategories: initialExpenseCategories,
  expenseTypes: initialExpenseTypes,
  expenseItems: initialExpenseItems,
}) => {
  const [modulesMap, setModulesMap] = useState<
    Partial<Record<ErpModuleCode, ErpModuleOverview>>
  >(() => {
    const map: Partial<Record<ErpModuleCode, ErpModuleOverview>> = {};
    if (initialModules) {
      for (const mod of initialModules) {
        map[mod.code] = mod;
      }
    }
    return map;
  });
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedModule, setSelectedModule] =
    useState<ErpModuleOverview | null>(null);
  const [selectedSubMenu, setSelectedSubMenu] =
    useState<HorizontalMenuItem | null>(null);
  const [selectedChildSubMenu, setSelectedChildSubMenu] =
    useState<HorizontalMenuItem | null>(null);
  const companyResource = useCompanyCrudResource(true, initialCompanies);

  useEffect(() => {
    if (!selectedCompany || companyResource.companies.length === 0) {
      return;
    }
    const matched = companyResource.companies.find(
      (c) => c.id === selectedCompany.id
    );
    if (matched) {
      if (
        matched.name !== selectedCompany.name ||
        matched.series !== selectedCompany.series
      ) {
        setSelectedCompany(matched);
      }
      return;
    }
    if (selectedCompany.id === 0) {
      setSelectedCompany(companyResource.companies[0]);
      return;
    }
    setSelectedCompany(null);
    setSelectedModule(null);
    setSelectedSubMenu(null);
    setSelectedChildSubMenu(null);
  }, [companyResource.companies, selectedCompany]);

  useEffect(() => {
    if (initialModules) {
      const nextMap: Partial<Record<ErpModuleCode, ErpModuleOverview>> = {};
      for (const mod of initialModules) {
        nextMap[mod.code] = mod;
      }
      setModulesMap(nextMap);
    }
  }, [initialModules]);

  const handleSelectSeries = useCallback(() => {
    setSelectedCompany(null);
    setSelectedModule(null);
    setSelectedSubMenu(null);
    setSelectedChildSubMenu(null);
  }, []);

  const handleSelectCompany = useCallback((company: Company) => {
    setSelectedCompany((prev) => {
      if (prev?.id !== company.id) {
        setSelectedModule(null);
        setSelectedSubMenu(null);
        setSelectedChildSubMenu(null);
      }
      return company;
    });
  }, []);

  const handleSelectModule = useCallback((mod: ErpModuleOverview) => {
    setSelectedModule((prev) => {
      if (prev?.code !== mod.code) {
        setSelectedSubMenu(null);
        setSelectedChildSubMenu(null);
      }
      return mod;
    });
  }, []);

  const handleSelectSubMenu = useCallback((item: HorizontalMenuItem) => {
    setSelectedSubMenu((prev) => {
      if (prev?.code !== item.code) {
        setSelectedChildSubMenu(null);
      }
      return item;
    });
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (initialModules !== undefined) {
      return;
    }
    try {
      const modulesRes = await fetchErpModules();
      const nextMap: Partial<Record<ErpModuleCode, ErpModuleOverview>> = {};
      for (const mod of modulesRes.data) {
        nextMap[mod.code] = mod;
      }
      setModulesMap(nextMap);
    } catch {
      // Fallback to default module definitions when API is unreachable
    }
  }, [initialModules]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-8">
      <PageHeader
        eyebrow="ENTERPRISE RESOURCE PLANNING"
        title="PT. Slaras Nusa Foodlab"
        companies={companyResource.companies}
        selectedCompanyId={selectedCompany?.id ?? null}
        onSelectSeries={handleSelectSeries}
        onSelectCompany={handleSelectCompany}
      />

      <main className="grid grid-cols-1 gap-6">
        {selectedCompany && (
          <>
            <section aria-label="ERP Executive Modules">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
                <CfoModuleCard
                  data={modulesMap.CFO}
                  isSelected={selectedModule?.code === 'CFO'}
                  onSelect={handleSelectModule}
                />
                <ChoModuleCard
                  data={modulesMap.CHO}
                  isSelected={selectedModule?.code === 'CHO'}
                  onSelect={handleSelectModule}
                />
                <CpoModuleCard
                  data={modulesMap.CPO}
                  isSelected={selectedModule?.code === 'CPO'}
                  onSelect={handleSelectModule}
                />
                <CdoModuleCard
                  data={modulesMap.CDO}
                  isSelected={selectedModule?.code === 'CDO'}
                  onSelect={handleSelectModule}
                />
                <CmoModuleCard
                  data={modulesMap.CMO}
                  isSelected={selectedModule?.code === 'CMO'}
                  onSelect={handleSelectModule}
                />
              </div>
            </section>

            {selectedModule?.code === 'CFO' && (
              <section aria-label="CFO Module Navigation">
                <CfoHorizontalMenu
                  selectedCode={selectedSubMenu?.code ?? null}
                  selectedChildCode={selectedChildSubMenu?.code ?? null}
                  onSelect={handleSelectSubMenu}
                  onSelectChild={setSelectedChildSubMenu}
                />
              </section>
            )}

            <CompanyCrudModal
              isOpen={selectedChildSubMenu?.code === 'PERUSAHAAN'}
              initialCompanies={initialCompanies}
              initialCapitalCompanies={initialCapitalCompanies}
              companyResource={companyResource}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <CapitalCompanyCrudModal
              isOpen={
                selectedChildSubMenu?.code === 'DAFTAR_KAPITAL_PERUSAHAAN'
              }
              initialCompanies={companyResource.companies}
              initialCapitalCompanies={initialCapitalCompanies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <MasterOperasionalCrudModal
              isOpen={selectedChildSubMenu?.code === 'MASTER_OPERASIONAL'}
              company={selectedCompany}
              companies={companyResource.companies}
              initialExpenseCategories={initialExpenseCategories}
              initialExpenseTypes={initialExpenseTypes}
              initialExpenseItems={initialExpenseItems}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <ViewOperasionalModal
              isOpen={selectedChildSubMenu?.code === 'VIEW_OPERASIONAL'}
              company={selectedCompany}
              initialExpenseCategories={initialExpenseCategories}
              initialExpenseTypes={initialExpenseTypes}
              initialExpenseItems={initialExpenseItems}
              onClose={() => setSelectedChildSubMenu(null)}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
