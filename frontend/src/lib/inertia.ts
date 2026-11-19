import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import {
  type CapitalCompany,
  type Company,
  type ErpModuleOverview,
  type ExpenseCategory,
  type ExpenseItem,
  type ExpenseType,
  createCapitalCompany,
  createCompany,
  createExpenseCategory,
  createExpenseItem,
  createExpenseType,
  deleteCapitalCompany,
  deleteCompany,
  deleteExpenseCategory,
  deleteExpenseItem,
  deleteExpenseType,
  fetchCapitalCompanies,
  fetchCompanies,
  fetchExpenseCategories,
  fetchExpenseItems,
  fetchExpenseTypes,
  updateCapitalCompany,
  updateCompany,
  updateExpenseCategory,
  updateExpenseItem,
  updateExpenseType,
} from '@/api/client';

export interface ErpDashboardPageProps {
  modules?: ErpModuleOverview[];
  companies?: Company[];
  capitalCompanies?: CapitalCompany[];
  expenseCategories?: ExpenseCategory[];
  expenseTypes?: ExpenseType[];
  expenseItems?: ExpenseItem[];
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
    if (initialCompanies !== undefined) {
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

  const create = useCallback(async (name: string, series = 1) => {
    if (isInertiaActive()) {
      router.post(
        '/cfo/companies',
        { name, series },
        { preserveScroll: true }
      );
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createCompany({ name, series });
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

  const update = useCallback(async (id: number, name: string, series = 1) => {
    if (isInertiaActive()) {
      router.put(
        `/cfo/companies/${id}`,
        { name, series },
        { preserveScroll: true }
      );
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await updateCompany(id, { name, series });
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

export type CompanyCrudResource = ReturnType<typeof useCompanyCrudResource>;

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
  const hasExternalCompanies = initialCompanies !== undefined;

  useEffect(() => {
    if (initialCompanies) setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    if (initialCapitalCompanies) setCapitalCompanies(initialCapitalCompanies);
  }, [initialCapitalCompanies]);

  const loadData = useCallback(async () => {
    if (
      hasExternalCompanies &&
      initialCapitalCompanies !== undefined &&
      isInertiaActive()
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (hasExternalCompanies) {
        const capitalRes = await fetchCapitalCompanies();
        setCapitalCompanies(capitalRes.data);
      } else {
        const [capitalRes, companiesRes] = await Promise.all([
          fetchCapitalCompanies(),
          fetchCompanies(),
        ]);
        setCapitalCompanies(capitalRes.data);
        setCompanies(companiesRes.data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data kapital perusahaan.'
      );
    } finally {
      setLoading(false);
    }
  }, [hasExternalCompanies, initialCapitalCompanies]);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  return { capitalCompanies, companies, loading, error };
}

export function useMasterOperasionalCrudResource(
  isOpen: boolean,
  company: Company | null,
  initialCategories?: ExpenseCategory[],
  initialTypes?: ExpenseType[],
  initialItems?: ExpenseItem[]
) {
  const [allCategories, setAllCategories] = useState<ExpenseCategory[]>(
    initialCategories ?? []
  );
  const [allTypes, setAllTypes] = useState<ExpenseType[]>(initialTypes ?? []);
  const [allItems, setAllItems] = useState<ExpenseItem[]>(initialItems ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategories) setAllCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    if (initialTypes) setAllTypes(initialTypes);
  }, [initialTypes]);

  useEffect(() => {
    if (initialItems) setAllItems(initialItems);
  }, [initialItems]);

  const loadData = useCallback(async () => {
    if (
      initialCategories !== undefined &&
      initialTypes !== undefined &&
      initialItems !== undefined
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [catRes, typeRes, itemRes] = await Promise.all([
        fetchExpenseCategories(),
        fetchExpenseTypes(),
        fetchExpenseItems(),
      ]);
      setAllCategories(catRes?.data ?? []);
      setAllTypes(typeRes?.data ?? []);
      setAllItems(itemRes?.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data master operasional.'
      );
    } finally {
      setLoading(false);
    }
  }, [initialCategories, initialTypes, initialItems]);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen, loadData]);

  const categories = useMemo<ExpenseCategory[]>(() => {
    if (!company) {
      return allCategories;
    }
    return allCategories.filter(
      (category) => Number(category.company_id) === company.id
    );
  }, [allCategories, company]);

  const types = useMemo<ExpenseType[]>(() => {
    if (!company) {
      return allTypes;
    }
    return allTypes.filter((type) => Number(type.company_id) === company.id);
  }, [allTypes, company]);

  const items = useMemo<ExpenseItem[]>(() => {
    if (!company) {
      return allItems;
    }
    return allItems.filter((item) => Number(item.company_id) === company.id);
  }, [allItems, company]);

  const createCategory = useCallback(
    async (name: string, companyId?: number) => {
      const resolvedCompanyId = companyId ?? company?.id;
      if (!resolvedCompanyId) return null;
      const payload = { company_id: resolvedCompanyId, name };
      if (isInertiaActive()) {
        router.post('/cfo/expense-categories', payload, {
          preserveScroll: true,
        });
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await createExpenseCategory(payload);
        setAllCategories((prev) => [res.data, ...prev]);
        return res.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Gagal menambahkan kategori.'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [company]
  );

  const updateCategory = useCallback(
    async (id: number, name: string, companyId?: number) => {
      const resolvedCompanyId = companyId ?? company?.id;
      if (!resolvedCompanyId) return null;
      const payload = { company_id: resolvedCompanyId, name };
      if (isInertiaActive()) {
        router.put(`/cfo/expense-categories/${id}`, payload, {
          preserveScroll: true,
        });
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await updateExpenseCategory(id, payload);
        setAllCategories((prev) =>
          prev.map((item) => (item.id === id ? res.data : item))
        );
        return res.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Gagal memperbarui kategori.'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [company]
  );

  const removeCategory = useCallback(async (id: number) => {
    if (isInertiaActive()) {
      router.delete(`/cfo/expense-categories/${id}`, { preserveScroll: true });
      return true;
    }
    setLoading(true);
    setError(null);
    try {
      await deleteExpenseCategory(id);
      setAllCategories((prev) => prev.filter((item) => item.id !== id));
      setAllTypes((prev) =>
        prev.filter((item) => Number(item.expense_category_id) !== id)
      );
      setAllItems((prev) =>
        prev.filter((item) => Number(item.expense_category_id) !== id)
      );
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus kategori.'
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const createType = useCallback(
    async (expenseCategoryId: number, name: string, companyId?: number) => {
      const resolvedCompanyId = companyId ?? company?.id;
      if (!resolvedCompanyId) return null;
      const payload = {
        company_id: resolvedCompanyId,
        expense_category_id: expenseCategoryId,
        name,
      };
      if (isInertiaActive()) {
        router.post('/cfo/expense-types', payload, { preserveScroll: true });
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await createExpenseType(payload);
        setAllTypes((prev) => [res.data, ...prev]);
        return res.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Gagal menambahkan tipe.'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [company]
  );

  const updateType = useCallback(
    async (
      id: number,
      expenseCategoryId: number,
      name: string,
      companyId?: number
    ) => {
      const resolvedCompanyId = companyId ?? company?.id;
      if (!resolvedCompanyId) return null;
      const payload = {
        company_id: resolvedCompanyId,
        expense_category_id: expenseCategoryId,
        name,
      };
      if (isInertiaActive()) {
        router.put(`/cfo/expense-types/${id}`, payload, {
          preserveScroll: true,
        });
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await updateExpenseType(id, payload);
        setAllTypes((prev) =>
          prev.map((item) => (item.id === id ? res.data : item))
        );
        return res.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Gagal memperbarui tipe.'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [company]
  );

  const removeType = useCallback(async (id: number) => {
    if (isInertiaActive()) {
      router.delete(`/cfo/expense-types/${id}`, { preserveScroll: true });
      return true;
    }
    setLoading(true);
    setError(null);
    try {
      await deleteExpenseType(id);
      setAllTypes((prev) => prev.filter((item) => item.id !== id));
      setAllItems((prev) =>
        prev.filter((item) => Number(item.expense_type_id) !== id)
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus tipe.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const buildExpenseItemPayload = useCallback(
    (input: {
      companyId?: number;
      expenseCategoryId?: number;
      expenseTypeId: number;
      name: string;
      amount: number;
      purchasedOn: string;
      closingDate?: string | null;
      employeeId?: number | null;
      detail?: string | null;
    }) => {
      const resolvedCompanyId = input.companyId ?? company?.id;
      if (!resolvedCompanyId) {
        return null;
      }
      const matchedType = allTypes.find((t) => t.id === input.expenseTypeId);
      const resolvedCategoryId =
        input.expenseCategoryId ?? matchedType?.expense_category_id;
      return {
        ...(resolvedCategoryId
          ? { expense_category_id: resolvedCategoryId }
          : {}),
        expense_type_id: input.expenseTypeId,
        company_id: resolvedCompanyId,
        name: input.name,
        amount: input.amount,
        purchased_on: input.purchasedOn,
        ...(input.closingDate !== undefined
          ? { closing_date: input.closingDate }
          : {}),
        ...(input.employeeId !== undefined
          ? { employee_id: input.employeeId }
          : {}),
        ...(input.detail !== undefined
          ? { detail: input.detail || null }
          : {}),
      };
    },
    [company, allTypes]
  );

  const createItem = useCallback(
    async (input: {
      companyId?: number;
      expenseCategoryId?: number;
      expenseTypeId: number;
      name: string;
      amount: number;
      purchasedOn: string;
      closingDate?: string | null;
      employeeId?: number | null;
      detail?: string | null;
    }) => {
      const payload = buildExpenseItemPayload(input);
      if (!payload) return null;
      if (isInertiaActive()) {
        router.post('/cfo/expense-items', payload, { preserveScroll: true });
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await createExpenseItem(payload);
        setAllItems((prev) => [res.data, ...prev]);
        return res.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Gagal menambahkan item.'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [buildExpenseItemPayload]
  );

  const updateItem = useCallback(
    async (
      id: number,
      input: {
        companyId?: number;
        expenseCategoryId?: number;
        expenseTypeId: number;
        name: string;
        amount: number;
        purchasedOn: string;
        closingDate?: string | null;
        employeeId?: number | null;
        detail?: string | null;
      }
    ) => {
      const payload = buildExpenseItemPayload(input);
      if (!payload) return null;
      if (isInertiaActive()) {
        router.put(`/cfo/expense-items/${id}`, payload, {
          preserveScroll: true,
        });
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await updateExpenseItem(id, payload);
        setAllItems((prev) =>
          prev.map((item) => (item.id === id ? res.data : item))
        );
        return res.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Gagal memperbarui item.'
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [buildExpenseItemPayload]
  );

  const removeItem = useCallback(async (id: number) => {
    if (isInertiaActive()) {
      router.delete(`/cfo/expense-items/${id}`, { preserveScroll: true });
      return true;
    }
    setLoading(true);
    setError(null);
    try {
      await deleteExpenseItem(id);
      setAllItems((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus item.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    allCategories,
    allTypes,
    allItems,
    categories,
    types,
    items,
    loading,
    error,
    createCategory,
    updateCategory,
    removeCategory,
    createType,
    updateType,
    removeType,
    createItem,
    updateItem,
    removeItem,
  };
}
