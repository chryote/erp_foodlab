import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchErpModules,
  type ErpModuleCode,
  type ErpModuleOverview,
} from './api/client';
import { CfoModuleCard } from './modules/CFO/CfoModuleCard';
import { ChoModuleCard } from './modules/CHO/ChoModuleCard';
import { CpoModuleCard } from './modules/CPO/CpoModuleCard';
import { CdoModuleCard } from './modules/CDO/CdoModuleCard';
import { CmoModuleCard } from './modules/CMO/CmoModuleCard';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  PageHeader,
} from './components/ui';
import './App.css';

export const App: React.FC = () => {
  const [modulesMap, setModulesMap] = useState<
    Partial<Record<ErpModuleCode, ErpModuleOverview>>
  >({});
  const [selectedModule, setSelectedModule] =
    useState<ErpModuleOverview | null>(null);

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
              onSelect={setSelectedModule}
            />
            <ChoModuleCard
              data={modulesMap.CHO}
              isSelected={selectedModule?.code === 'CHO'}
              onSelect={setSelectedModule}
            />
            <CpoModuleCard
              data={modulesMap.CPO}
              isSelected={selectedModule?.code === 'CPO'}
              onSelect={setSelectedModule}
            />
            <CdoModuleCard
              data={modulesMap.CDO}
              isSelected={selectedModule?.code === 'CDO'}
              onSelect={setSelectedModule}
            />
            <CmoModuleCard
              data={modulesMap.CMO}
              isSelected={selectedModule?.code === 'CMO'}
              onSelect={setSelectedModule}
            />
          </div>
        </section>

        {selectedModule && (
          <Card
            variant="highlighted"
            aria-label="Selected Module Workspace"
            data-testid="selected-module-panel"
          >
            <CardHeader
              eyebrow={`WORKSPACE MODUL ${selectedModule.code}`}
              title={selectedModule.title}
              subtitle={selectedModule.subtitle}
              actions={
                <Button
                  variant="secondary"
                  onClick={() => setSelectedModule(null)}
                >
                  Tutup Detail
                </Button>
              }
            />

            <DataTable
              columns={[
                {
                  key: 'id',
                  header: 'ID Dokumen',
                  render: (item) => <code>{item.id}</code>,
                },
                {
                  key: 'name',
                  header: 'Deskripsi Aktivitas',
                  render: (item) => item.name,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (item) => <Badge variant="ok">{item.status}</Badge>,
                },
              ]}
              data={selectedModule.recent_items}
              rowKey={(item) => item.id}
            />
          </Card>
        )}
      </main>
    </div>
  );
};

export default App;
