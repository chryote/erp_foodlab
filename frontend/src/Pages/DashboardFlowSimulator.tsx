import React, { useCallback, useEffect, useState } from 'react';
import {
  type Company,
  type ErpModuleOverview,
  syncActiveCompany,
} from '@/api/client';
import {
  type HorizontalMenuItem,
  Button,
  ConfirmDialog,
  PageHeader,
} from '@/components/ui';
import { setActiveCompanyId } from '@/lib/activeCompanyStorage';
import {
  useCompanyCrudResource,
  useErpModulesQuery,
} from '@/lib/cfoResources';
import { CdoModuleCard } from '@/modules/CDO/CdoModuleCard';
import { CapitalCompanyCrudModal } from '@/modules/CFO/CapitalCompanyCrudModal';
import {
  CfoHorizontalMenu,
  CfoModuleCard,
} from '@/modules/CFO/CfoModuleCard';
import { CompanyAssetCrudModal } from '@/modules/CFO/CompanyAssetCrudModal';
import { CompanyCrudModal } from '@/modules/CFO/CompanyCrudModal';
import { ExpenseItemCrudModal } from '@/modules/CFO/ExpenseItemCrudModal';
import { MasterOperasionalCrudModal } from '@/modules/CFO/MasterOperasionalCrudModal';
import { ViewCompanyAssetModal } from '@/modules/CFO/ViewCompanyAssetModal';
import { ViewOperasionalModal } from '@/modules/CFO/ViewOperasionalModal';
import {
  ChoHorizontalMenu,
  ChoModuleCard,
} from '@/modules/CHO/ChoModuleCard';
import { InputAbsensiCrudModal } from '@/modules/CHO/InputAbsensiCrudModal';
import { InputKaryawanCrudModal } from '@/modules/CHO/InputKaryawanCrudModal';
import { InputPayrollModal } from '@/modules/CHO/InputPayrollModal';
import { MasterKaryawanCrudModal } from '@/modules/CHO/MasterKaryawanCrudModal';
import { MasterPresensiCrudModal } from '@/modules/CHO/MasterPresensiCrudModal';
import { ViewKaryawanModal } from '@/modules/CHO/ViewKaryawanModal';
import { CmoModuleCard } from '@/modules/CMO/CmoModuleCard';
import {
  CpoHorizontalMenu,
  CpoModuleCard,
} from '@/modules/CPO/CpoModuleCard';
import { MasterItemInternalCrudModal } from '@/modules/CPO/MasterItemInternalCrudModal';
import { MasterItemVendorCrudModal } from '@/modules/CPO/MasterItemVendorCrudModal';
import { MasterPaketCrudModal } from '@/modules/CPO/MasterPaketCrudModal';
import { ViewPaketAwalModal } from '@/modules/CPO/ViewPaketAwalModal';

export interface DashboardProps {
  onLogout?: () => void | Promise<void>;
}

export const DashboardFlowSimulator: React.FC<DashboardProps> = ({ onLogout }) => {
  const { modulesMap } = useErpModulesQuery();
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedModule, setSelectedModule] =
    useState<ErpModuleOverview | null>(null);
  const [selectedSubMenu, setSelectedSubMenu] =
    useState<HorizontalMenuItem | null>(null);
  const [selectedChildSubMenu, setSelectedChildSubMenu] =
    useState<HorizontalMenuItem | null>(null);
  const companyResource = useCompanyCrudResource(true);

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
    setActiveCompanyId(selectedCompany?.id ?? null);
  }, [selectedCompany?.id]);

  const handleSelectSeries = useCallback(() => {
    setSelectedCompany(null);
    setSelectedModule(null);
    setSelectedSubMenu(null);
    setSelectedChildSubMenu(null);
    setActiveCompanyId(null);
    void Promise.resolve(syncActiveCompany(null)).catch(() => undefined);
  }, []);

  const handleSelectCompany = useCallback((company: Company) => {
    setActiveCompanyId(company.id);
    void Promise.resolve(syncActiveCompany(company.id)).catch(() => undefined);
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

  return (
    <>
    <div className="mx-auto max-w-[1360px] px-6 py-8">
      <PageHeader
        eyebrow="ENTERPRISE RESOURCE PLANNING"
        title="PT. Slaras Nusa Foodlab"
        companies={companyResource.companies}
        selectedCompanyId={selectedCompany?.id ?? null}
        onSelectSeries={handleSelectSeries}
        onSelectCompany={handleSelectCompany}
        actions={
          onLogout ? (
            <Button
              variant="secondary"
              aria-label="Keluar"
              onClick={() => setLogoutConfirmationOpen(true)}
            >
              Keluar
            </Button>
          ) : undefined
        }
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

            {selectedModule?.code === 'CHO' && (
              <section aria-label="CHO Module Navigation">
                <ChoHorizontalMenu
                  selectedCode={selectedSubMenu?.code ?? null}
                  selectedChildCode={selectedChildSubMenu?.code ?? null}
                  onSelect={handleSelectSubMenu}
                  onSelectChild={setSelectedChildSubMenu}
                />
              </section>
            )}

            {selectedModule?.code === 'CPO' && (
              <section aria-label="CPO Module Navigation">
                <CpoHorizontalMenu
                  selectedCode={selectedSubMenu?.code ?? null}
                  selectedChildCode={selectedChildSubMenu?.code ?? null}
                  onSelect={handleSelectSubMenu}
                  onSelectChild={setSelectedChildSubMenu}
                />
              </section>
            )}

            <CompanyCrudModal
              isOpen={selectedChildSubMenu?.code === 'PERUSAHAAN'}
              companyResource={companyResource}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <CapitalCompanyCrudModal
              isOpen={
                selectedChildSubMenu?.code === 'DAFTAR_KAPITAL_PERUSAHAAN'
              }
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <MasterOperasionalCrudModal
              isOpen={selectedChildSubMenu?.code === 'MASTER_OPERASIONAL'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <ViewOperasionalModal
              isOpen={selectedChildSubMenu?.code === 'VIEW_OPERASIONAL'}
              company={selectedCompany}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <ExpenseItemCrudModal
              isOpen={selectedChildSubMenu?.code === 'ITEM_OPERASIONAL'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <CompanyAssetCrudModal
              isOpen={selectedChildSubMenu?.code === 'MASTER_ASET'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <ViewCompanyAssetModal
              isOpen={selectedChildSubMenu?.code === 'VIEW_ASET'}
              company={selectedCompany}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <MasterKaryawanCrudModal
              isOpen={selectedChildSubMenu?.code === 'MASTER_KARYAWAN'}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <InputKaryawanCrudModal
              isOpen={selectedChildSubMenu?.code === 'INPUT_KARYAWAN'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <ViewKaryawanModal
              isOpen={selectedChildSubMenu?.code === 'VIEW_KARYAWAN'}
              company={selectedCompany}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <MasterPresensiCrudModal
              isOpen={selectedChildSubMenu?.code === 'MASTER_PRESENSI'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <InputAbsensiCrudModal
              isOpen={selectedChildSubMenu?.code === 'INPUT_ABSENSI'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <InputPayrollModal
              isOpen={selectedChildSubMenu?.code === 'INPUT_PAYROLL'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <MasterPaketCrudModal
              isOpen={selectedChildSubMenu?.code === 'MASTER_PAKET'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <ViewPaketAwalModal
              isOpen={selectedChildSubMenu?.code === 'VIEW_PAKET_AWAL'}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <MasterItemVendorCrudModal
              isOpen={selectedChildSubMenu?.code === 'MASTER_ITEM_VENDOR'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />

            <MasterItemInternalCrudModal
              isOpen={selectedChildSubMenu?.code === 'MASTER_ITEM_INTERNAL'}
              company={selectedCompany}
              companies={companyResource.companies}
              onClose={() => setSelectedChildSubMenu(null)}
            />
          </>
        )}
      </main>
      <ConfirmDialog
        isOpen={logoutConfirmationOpen}
        title="Konfirmasi keluar"
        message="Anda yakin ingin keluar dari aplikasi? Perubahan yang belum disimpan dapat hilang."
        confirmLabel={logoutLoading ? 'Keluar...' : 'Ya, keluar'}
        cancelLabel="Batal"
        loading={logoutLoading}
        testId="logout-confirm-dialog"
        onConfirm={async () => {
          setLogoutLoading(true);
          try {
            await onLogout?.();
          } finally {
            setLogoutLoading(false);
            setLogoutConfirmationOpen(false);
          }
        }}
        onCancel={() => setLogoutConfirmationOpen(false)}
      />
    </div>
    </>
  );
};

export default DashboardFlowSimulator;
