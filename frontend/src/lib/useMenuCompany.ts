import { useParams } from 'react-router-dom';
import { useCompanyCrudResource } from '@/lib/cfoResources';
import { getActiveCompanyId } from '@/lib/activeCompanyStorage';

export function useMenuCompany() {
  const { companyId: routeCompanyId } = useParams();
  const parsedCompanyId = Number(routeCompanyId);
  const selectedCompanyId =
    Number.isSafeInteger(parsedCompanyId) && parsedCompanyId > 0
      ? parsedCompanyId
      : getActiveCompanyId();
  const companyResource = useCompanyCrudResource(true);
  const company =
    companyResource.companies.find(
      (item) => item.id === selectedCompanyId
    ) ?? null;

  return {
    company,
    companies: companyResource.companies,
    loading: companyResource.loading,
    error: companyResource.error,
  };
}
