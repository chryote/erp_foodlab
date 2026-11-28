import { useLayoutEffect, useRef } from 'react';
import { MasterPaketCrudModal } from '@/modules/CPO/MasterPaketCrudModal';
import { useMenuCompany } from '@/lib/useMenuCompany';
import '../cpo-page.css';
import './master-paket-pages.css';

export default function CpoMasterPaketAwalPage() {
  const { company, companies, loading, error } = useMenuCompany();
  const pageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (loading || error) {
      return;
    }

    const packageTab = pageRef.current?.querySelector<HTMLButtonElement>(
      '[data-testid="master-paket-tab-default-package"]'
    );
    if (!packageTab) {
      throw new Error('Tab Paket Awal tidak ditemukan pada halaman Master Paket.');
    }
    packageTab.click();
  }, [error, loading]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Memuat data perusahaan...</p>;
  }
  if (error) {
    return <p role="alert" className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div ref={pageRef} className="cpo-page cpo-master-paket-page">
      <MasterPaketCrudModal
        isOpen
        pageMode
        company={company}
        companies={companies}
        onClose={() => undefined}
      />
    </div>
  );
}
