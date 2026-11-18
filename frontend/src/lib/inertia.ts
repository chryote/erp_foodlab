import { useCallback, useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
  type CapitalCompany,
  type Company,
  type ErpModuleOverview,
  createCapitalCompany,
  createCompany,
  deleteCapitalCompany,
  deleteCompany,
  fetchCapitalCompanies,
  fetchCompanies,
  updateCapitalCompany,
  updateCompany,
} from '@/api/client';

export interface ErpDashboardPageProps {
  modules?: ErpModuleOverview[];
  companies?: Company[];
  capitalCompanies?: CapitalCompany[];
  flash?: {
    success?: string | null;
    error?: string | null;
  };
  errors?: Record<string, string>;
}

function isInertiaActive(): boolean {
  return (
    typeof document !== 'undefined' &&
    Boolean(document.getElementById('app')?.hasAttribute('data-page'))
  );
}

export function useCompanyCrudResource(
  isOpen: boolean,
  initialCompanies?: Company[]
) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCompanies) {
      setCompanies(initialCompanies);
    }
  }, [initialCompanies]);

  const reload = useCallback(async () => {
    if (initialCompanies !== undefined && isInertiaActive()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCompanies();
      setCompanies(res.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat data perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  }, [initialCompanies]);

  useEffect(() => {
    if (isOpen) {
      void reload();
    }
  }, [isOpen, reload]);

  const create = useCallback(async (name: string) => {
    if (isInertiaActive()) {
      router.post('/cfo/companies', { name }, { preserveScroll: true });
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createCompany({ name });
      setCompanies((prev) => [res.data, ...prev]);
      return res.data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menambahkan perusahaan.'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: number, name: string) => {
    if (isInertiaActive()) {
      router.put(`/cfo/companies/${id}`, { name }, { preserveScroll: true });
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await updateCompany(id, { name });
      setCompanies((prev) =>
        prev.map((item) => (item.id === id ? res.data : item))
      );
      return res.data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memperbarui perusahaan.'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    if (isInertiaActive()) {
      router.delete(`/cfo/companies/${id}`, { preserveScroll: true });
      return true;
    }
    setLoading(true);
    setError(null);
    try {
      await deleteCompany(id);
      setCompanies((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus perusahaan.'
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { companies, loading, error, create, update, remove };
}

export function useStakeholderCrudResource(
  isOpen: boolean,
  company: Company | null,
  initialCapitalCompanies?: CapitalCompany[]
) {
  const [stakeholders, setStakeholders] = useState<CapitalCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!company) {
      return;
    }
    if (initialCapitalCompanies !== undefined && isInertiaActive()) {
      setStakeholders(
        initialCapitalCompanies.filter((item) => item.company_id === company.id)
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCapitalCompanies();
      setStakeholders(
        res.data.filter((item) => item.company_id === company.id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data pemegang saham.'
      );
    } finally {
      setLoading(false);
    }
  }, [company, initialCapitalCompanies]);

  useEffect(() => {
    if (isOpen && company) {
      void load();
    } else {
      setStakeholders([]);
      setError(null);
    }
  }, [isOpen, company, load]);

  const create = useCallback(
    async (stakeholderName: string, capital: number) => {
      if (!company) return;
      if (isInertiaActive()) {
        router.post(
          '/cfo/capital-companies',
          {
            company_id: company.id,
            stakeholder_name: stakeholderName,
            capital,
          },
          { preserveScroll: true }
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await createCapitalCompany({
          company_id: company.id,
          stakeholder_name: stakeholderName,
          capital,
        });
        setStakeholders((prev) => [res.data, ...prev]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal menambahkan pemegang saham.'
        );
      } finally {
        setLoading(false);
      }
    },
    [company]
  );

  const update = useCallback(
    async (id: number, stakeholderName: string, capital: number) => {
      if (!company) return;
      if (isInertiaActive()) {
        router.put(
          `/cfo/capital-companies/${id}`,
          {
            company_id: company.id,
            stakeholder_name: stakeholderName,
            capital,
          },
          { preserveScroll: true }
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await updateCapitalCompany(id, {
          company_id: company.id,
          stakeholder_name: stakeholderName,
          capital,
        });
        setStakeholders((prev) =>
          prev.map((item) => (item.id === id ? res.data : item))
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memperbarui pemegang saham.'
        );
      } finally {
        setLoading(false);
      }
    },
    [company]
  );

  const remove = useCallback(async (id: number) => {
    if (isInertiaActive()) {
      router.delete(`/cfo/capital-companies/${id}`, { preserveScroll: true });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await deleteCapitalCompany(id);
      setStakeholders((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus pemegang saham.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { stakeholders, loading, error, create, update, remove };
}

export function useCapitalOverviewResource(
  isOpen: boolean,
  initialCompanies?: Company[],
  initialCapitalCompanies?: CapitalCompany[]
) {
  const [capitalCompanies, setCapitalCompanies] = useState<CapitalCompany[]>(
    initialCapitalCompanies ?? []
  );
  const [companies, setCompanies] = useState<Company[]>(initialCompanies ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCompanies) setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    if (initialCapitalCompanies) setCapitalCompanies(initialCapitalCompanies);
  }, [initialCapitalCompanies]);

  const loadData = useCallback(async () => {
    if (
      initialCompanies !== undefined &&
      initialCapitalCompanies !== undefined &&
      isInertiaActive()
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [capitalRes, companiesRes] = await Promise.all([
        fetchCapitalCompanies(),
        fetchCompanies(),
      ]);
      setCapitalCompanies(capitalRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data kapital perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  }, [initialCompanies, initialCapitalCompanies]);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  return { capitalCompanies, companies, loading, error };
}
