import { InputPayrollModal } from '@/modules/CHO/InputPayrollModal';
import { useMenuCompany } from '@/lib/useMenuCompany';

export default function ChoInputPayrollPage() {
  const { company, companies, loading, error } = useMenuCompany();

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Memuat data perusahaan...</p>;
  }
  if (error) {
    return <p role="alert" className="text-sm text-destructive">{error}</p>;
  }

  return (
    <InputPayrollModal
      isOpen={Boolean(company)}
      pageMode
      company={company}
      companies={companies}
      onClose={() => undefined}
    />
  );
}
