import { MasterItemInternalCrudModal } from '@/modules/CPO/MasterItemInternalCrudModal';
import { useMenuCompany } from '@/lib/useMenuCompany';
import '../cpo-page.css';

export default function CpoMasterItemInternalPage() {
  const { company, companies, loading, error } = useMenuCompany();

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Memuat data perusahaan...</p>;
  }
  if (error) {
    return <p role="alert" className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="cpo-page">
      <MasterItemInternalCrudModal
        isOpen
        pageMode
        company={company}
        companies={companies}
        onClose={() => undefined}
      />
    </div>
  );
}
