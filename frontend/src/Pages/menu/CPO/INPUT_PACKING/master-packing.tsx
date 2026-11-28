import { MasterPackingCrudModal } from '@/modules/CPO/MasterPackingCrudModal';
import { useMenuCompany } from '@/lib/useMenuCompany';

export default function CpoMasterPackingPage() {
  const { company, companies, loading, error } = useMenuCompany();

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Memuat data perusahaan...</p>;
  }
  if (error) {
    return <p role="alert" className="text-sm text-destructive">{error}</p>;
  }

  return (
    <MasterPackingCrudModal
      isOpen={Boolean(company)}
      pageMode
      company={company}
      companies={companies}
      onClose={() => undefined}
    />
  );
}
