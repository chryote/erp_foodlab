import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchErpModules,
  type ErpModuleCode,
  type ErpModuleOverview,
} from './api/client';
import {
  CfoHorizontalMenu,
  CfoModuleCard,
} from './modules/CFO/CfoModuleCard';
import { CapitalCompanyCrudModal } from './modules/CFO/CapitalCompanyCrudModal';
import { CompanyCrudModal } from './modules/CFO/CompanyCrudModal';
import { ChoModuleCard } from './modules/CHO/ChoModuleCard';
import { CpoModuleCard } from './modules/CPO/CpoModuleCard';
import { CdoModuleCard } from './modules/CDO/CdoModuleCard';
import { CmoModuleCard } from './modules/CMO/CmoModuleCard';
import {
  type HorizontalMenuItem,
  PageHeader,
} from './components/ui';
import './App.css';

export const App: React.FC = () => {
  const [modulesMap, setModulesMap] = useState<
    Partial<Record<ErpModuleCode, ErpModuleOverview>>
  >({});
  const [selectedModule, setSelectedModule] =
    useState<ErpModuleOverview | null>(null);
  const [selectedSubMenu, setSelectedSubMenu] =
    useState<HorizontalMenuItem | null>(null);
  const [selectedChildSubMenu, setSelectedChildSubMenu] =
    useState<HorizontalMenuItem | null>(null);

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
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="app-container">
      <PageHeader
        eyebrow="ENTERPRISE RESOURCE PLANNING"
        title="PT. Slaras Nusa Foodlab"
      />

      <main className="main-grid">
        <section aria-label="ERP Executive Modules">
          <div className="erp-modules-grid">
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
          onClose={() => setSelectedChildSubMenu(null)}
        />

        <CapitalCompanyCrudModal
          isOpen={selectedChildSubMenu?.code === 'DAFTAR_KAPITAL_PERUSAHAAN'}
          onClose={() => setSelectedChildSubMenu(null)}
        />
      </main>
    </div>
  );
};

export default App;
