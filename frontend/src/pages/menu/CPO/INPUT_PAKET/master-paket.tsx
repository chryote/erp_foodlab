import { MasterPaketCrudModal } from '@/modules/CPO/MasterPaketCrudModal';
import { useMenuCompany } from '@/lib/useMenuCompany';
import '../cpo-page.css';
import './master-paket-pages.css';

export default function CpoMasterPaketPage() {
  const { company, companies, loading, error } = useMenuCompany();

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Memuat data perusahaan...</p>;
  }
  if (error) {
    return <p role="alert" className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="cpo-page cpo-master-paket-page">
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
