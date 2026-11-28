import { MasterPaketCrudModal } from '@/modules/CPO/MasterPaketCrudModal';
import { useMenuCompany } from '@/lib/useMenuCompany';

export default function CpoMasterPaketPage() {
  const { company, companies, loading, error } = useMenuCompany();

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Memuat data perusahaan...</p>;
  }
  if (error) {
    return <p role="alert" className="text-sm text-destructive">{error}</p>;
  }

  return (
    <MasterPaketCrudModal
      isOpen
      company={company}
      companies={companies}
      onClose={() => undefined}
    />
  );
}
