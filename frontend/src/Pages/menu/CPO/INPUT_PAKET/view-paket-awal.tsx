import { ViewPaketAwalModal } from '@/modules/CPO/ViewPaketAwalModal';
import { useMenuCompany } from '@/lib/useMenuCompany';

export default function CpoViewPaketAwalPage() {
  const { companies, loading, error } = useMenuCompany();

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Memuat data perusahaan...</p>;
  }
  if (error) {
    return <p role="alert" className="text-sm text-destructive">{error}</p>;
  }

  return (
    <ViewPaketAwalModal
      isOpen
      companies={companies}
      onClose={() => undefined}
    />
  );
}
