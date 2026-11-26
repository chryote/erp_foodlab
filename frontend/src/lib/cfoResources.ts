import { useCallback, useMemo, useState } from 'react';
import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  type CapitalCompany,
  type CfoEnums,
  type Company,
  type CompanyAsset,
  type CompanyAssetPayload,
  type CompanyType,
  type ErpModuleCode,
  type ErpModuleOverview,
  type ExpenseCategory,
  type ExpenseItem,
  type ExpenseType,
  createCapitalCompany,
  createCompany,
  createCompanyAsset,
  createExpenseCategory,
  createExpenseItem,
  createExpenseType,
  deleteCapitalCompany,
  deleteCompany,
  deleteCompanyAsset,
  deleteExpenseCategory,
  deleteExpenseItem,
  deleteExpenseType,
  fetchCapitalCompanies,
  fetchCfoEnums,
  fetchCompanies,
  fetchCompanyAssets,
  fetchErpModules,
  fetchExpenseCategories,
  fetchExpenseItems,
  fetchExpenseTypes,
  updateCapitalCompany,
  updateCompany,
  updateCompanyAsset,
  updateExpenseCategory,
  updateExpenseItem,
  updateExpenseType,
} from '@/api/client';

export const DEFAULT_CFO_ENUMS: CfoEnums = {
  company_type: [
    { value: 'Utama', nama: 'Utama' },
    { value: 'Packing', nama: 'Packing' },
    { value: 'Kelengkapan', nama: 'Kelengkapan' },
    { value: 'Sarpras', nama: 'Sarpras' },
    { value: 'Bahan', nama: 'Bahan' },
  ],
};

export const cfoQueryKeys = {
  modules: ['erp', 'modules'] as const,
  enums: ['cfo', 'enums'] as const,
  companies: ['cfo', 'companies'] as const,
  capitalCompanies: ['cfo', 'capital-companies'] as const,
  expenseCategories: ['cfo', 'expense-categories'] as const,
  expenseTypes: ['cfo', 'expense-types'] as const,
  expenseItems: ['cfo', 'expense-items'] as const,
  companyAssets: ['cfo', 'company-assets'] as const,
};

export const CFO_LIST_PAGE_SIZE = 10;

function getNextListPage<T>(
  response: { data: T[]; meta: { last_page?: number } },
  page: number
): number | undefined {
  if (response.meta.last_page !== undefined) {
    return page < response.meta.last_page ? page + 1 : undefined;
  }

  return response.data.length === CFO_LIST_PAGE_SIZE ? page + 1 : undefined;
}

export function useInfiniteCompaniesQuery(
  search: string,
  sort: string
) {
  const searchTerm = search.trim();
  const seriesFilter = /^\d+$/.test(searchTerm) ? Number(searchTerm) : undefined;
  const canSearchSeries =
    seriesFilter !== undefined && Number.isSafeInteger(seriesFilter);

  return useInfiniteQuery({
    queryKey: [
      ...cfoQueryKeys.companies,
      'infinite',
      search,
      sort,
    ],
    queryFn: async ({ pageParam }) => {
      const searchResults = await fetchCompanies({
        page: pageParam,
        per_page: CFO_LIST_PAGE_SIZE,
        search: searchTerm || undefined,
        sort,
      });

      if (!canSearchSeries) {
        return searchResults;
      }

      const seriesResults = await fetchCompanies({
        page: pageParam,
        per_page: CFO_LIST_PAGE_SIZE,
        series: seriesFilter,
        sort,
      });
      const companies = new Map(
        [...searchResults.data, ...seriesResults.data].map((company) => [
          company.id,
          company,
        ])
      );
      const lastPage = Math.max(
        ...[searchResults, seriesResults].map(
          (response) =>
            response.meta.last_page ??
            (response.data.length === CFO_LIST_PAGE_SIZE
              ? pageParam + 1
              : pageParam)
        )
      );

      return {
        ...searchResults,
        data: [...companies.values()],
        meta: { ...searchResults.meta, last_page: lastPage },
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextListPage(lastPage, lastPageParam),
  });
}

export function useStakeholdersTotalCapitalQuery(companyId: number | null) {
  return useQuery({
    queryKey: [...cfoQueryKeys.capitalCompanies, 'total-capital', companyId],
    queryFn: async () => {
      const response = await fetchCapitalCompanies({
        page: 1,
        per_page: 1,
        company_id: companyId ?? undefined,
      });
      return (
        response.meta.total_capital ??
        Number(response.data[0]?.capital ?? 0)
      );
    },
    enabled: companyId !== null,
  });
}

export function useInfiniteStakeholdersQuery(
  companyId: number | null,
  search: string,
  sort: string
) {
  return useInfiniteQuery({
    queryKey: [
      ...cfoQueryKeys.capitalCompanies,
      'infinite',
      companyId,
      search,
      sort,
    ],
    queryFn: ({ pageParam }) =>
      fetchCapitalCompanies({
        page: pageParam,
        per_page: CFO_LIST_PAGE_SIZE,
        company_id: companyId ?? undefined,
        search,
        sort,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextListPage(lastPage, lastPageParam),
    enabled: companyId !== null,
  });
}

export function useInfiniteExpenseCategoriesQuery(
  companyId: number | null,
  search: string,
  sort: string
) {
  return useInfiniteQuery({
    queryKey: [
      ...cfoQueryKeys.expenseCategories,
      'infinite',
      companyId,
      search,
      sort,
    ],
    queryFn: ({ pageParam }) =>
      fetchExpenseCategories({
        page: pageParam,
        per_page: CFO_LIST_PAGE_SIZE,
        company_id: companyId ?? undefined,
        search: search.trim() || undefined,
        sort,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextListPage(lastPage, lastPageParam),
    enabled: companyId !== null,
  });
}

export function useInfiniteExpenseTypesQuery(
  companyId: number | null,
  search: string,
  sort: string
) {
  return useInfiniteQuery({
    queryKey: [
      ...cfoQueryKeys.expenseTypes,
      'infinite',
      companyId,
      search,
      sort,
    ],
    queryFn: ({ pageParam }) =>
      fetchExpenseTypes({
        page: pageParam,
        per_page: CFO_LIST_PAGE_SIZE,
        company_id: companyId ?? undefined,
        search: search.trim() || undefined,
        sort,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextListPage(lastPage, lastPageParam),
    enabled: companyId !== null,
  });
}

export function useInfiniteExpenseItemsQuery(
  companyId: number | null,
  search: string,
  sort: string
) {
  return useInfiniteQuery({
    queryKey: [
      ...cfoQueryKeys.expenseItems,
      'infinite',
      companyId,
      search,
      sort,
    ],
    queryFn: ({ pageParam }) =>
      fetchExpenseItems({
        page: pageParam,
        per_page: CFO_LIST_PAGE_SIZE,
        company_id: companyId ?? undefined,
        search: search.trim() || undefined,
        sort,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextListPage(lastPage, lastPageParam),
    enabled: companyId !== null,
  });
}

export function useInfiniteCompanyAssetsQuery(
  companyId: number | null,
  search: string,
  sort: string,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [
      ...cfoQueryKeys.companyAssets,
      'infinite',
      companyId,
      search,
      sort,
    ],
    queryFn: ({ pageParam }) =>
      fetchCompanyAssets({
        page: pageParam,
        per_page: CFO_LIST_PAGE_SIZE,
        company_id: companyId ?? undefined,
        search: search.trim() || undefined,
        sort,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextListPage(lastPage, lastPageParam),
    enabled,
  });
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

function getErrorMessage(err: unknown, fallback: string): string | null {
  if (!err) {
    return null;
  }
  return err instanceof Error ? err.message : fallback;
}

export function useErpModulesQuery() {
  const query = useQuery<ErpModuleOverview[]>({
    queryKey: cfoQueryKeys.modules,
    queryFn: async () => {
      const res = await fetchErpModules();
      return res?.data ?? [];
    },
  });

  const modulesMap = useMemo(() => {
    const map: Partial<Record<ErpModuleCode, ErpModuleOverview>> = {};
    for (const mod of query.data ?? []) {
      map[mod.code] = mod;
    }
    return map;
  }, [query.data]);

  return {
    modules: query.data ?? [],
    modulesMap,
    loading: query.isLoading,
    error: getErrorMessage(query.error, 'Gagal memuat daftar modul ERP.'),
  };
}

export function useCfoEnumsResource(enabled = true) {
  const enumsQuery = useQuery<CfoEnums>({
    queryKey: cfoQueryKeys.enums,
    queryFn: async () => {
      const res = await fetchCfoEnums();
      return res?.data ?? DEFAULT_CFO_ENUMS;
    },
    enabled,
    staleTime: 0,
  });

  return {
    enums: enumsQuery.data ?? DEFAULT_CFO_ENUMS,
    loading: enumsQuery.isLoading,
    refetch: enumsQuery.refetch,
  };
}

export function useCompanyCrudResource(enabled = true) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const enumsResource = useCfoEnumsResource(enabled);

  const companiesQuery = useQuery<Company[]>({
    queryKey: cfoQueryKeys.companies,
    queryFn: async () => {
      const res = await fetchCompanies();
      return res?.data ?? [];
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      series: number;
      type?: CompanyType;
    }) => {
      const res = await createCompany(input);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Company[]>(cfoQueryKeys.companies, (prev = []) => [
        created,
        ...prev,
      ]);
      void queryClient.invalidateQueries({ queryKey: cfoQueryKeys.companies });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      name: string;
      series: number;
      type?: CompanyType;
    }) => {
      const res = await updateCompany(input.id, {
        name: input.name,
        series: input.series,
        type: input.type,
      });
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Company[]>(cfoQueryKeys.companies, (prev = []) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({ queryKey: cfoQueryKeys.companies });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.capitalCompanies,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseCategories,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseTypes,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.companyAssets,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteCompany(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Company[]>(cfoQueryKeys.companies, (prev = []) =>
        prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({ queryKey: cfoQueryKeys.companies });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.capitalCompanies,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseCategories,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseTypes,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.companyAssets,
      });
    },
  });

  const create = useCallback(
    async (
      name: string,
      series = 1,
      type: CompanyType = 'Utama'
    ): Promise<Company | null> => {
      setMutationError(null);
      try {
        return await createMutation.mutateAsync({ name, series, type });
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menambahkan perusahaan.'));
        return null;
      }
    },
    [createMutation]
  );

  const update = useCallback(
    async (
      id: number,
      name: string,
      series = 1,
      type: CompanyType = 'Utama'
    ): Promise<Company | null> => {
      setMutationError(null);
      try {
        return await updateMutation.mutateAsync({ id, name, series, type });
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal memperbarui perusahaan.'));
        return null;
      }
    },
    [updateMutation]
  );

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      setMutationError(null);
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menghapus perusahaan.'));
        return false;
      }
    },
    [deleteMutation]
  );

  return {
    enums: enumsResource.enums,
    refetchEnums: enumsResource.refetch,
    companies: companiesQuery.data ?? [],
    loading:
      companiesQuery.isLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error:
      mutationError ??
      getErrorMessage(companiesQuery.error, 'Gagal memuat data perusahaan.'),
    create,
    update,
    remove,
  };
}

export type CompanyCrudResource = ReturnType<typeof useCompanyCrudResource>;

export function useCapitalOverviewResource(enabled: boolean) {
  const companiesQuery = useQuery<Company[]>({
    queryKey: cfoQueryKeys.companies,
    queryFn: async () => {
      const res = await fetchCompanies();
      return res?.data ?? [];
    },
    enabled,
  });

  const capitalQuery = useQuery<CapitalCompany[]>({
    queryKey: cfoQueryKeys.capitalCompanies,
    queryFn: async () => {
      const res = await fetchCapitalCompanies();
      return res?.data ?? [];
    },
    enabled,
  });

  return {
    capitalCompanies: capitalQuery.data ?? [],
    companies: companiesQuery.data ?? [],
    loading: companiesQuery.isLoading || capitalQuery.isLoading,
    error:
      getErrorMessage(
        capitalQuery.error ?? companiesQuery.error,
        'Gagal memuat daftar kapital perusahaan.'
      ),
  };
}

export function useStakeholderCrudResource(
  enabled: boolean,
  company: Company | null
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const capitalQuery = useQuery<CapitalCompany[]>({
    queryKey: cfoQueryKeys.capitalCompanies,
    queryFn: async () => {
      const res = await fetchCapitalCompanies();
      return res?.data ?? [];
    },
    enabled: enabled && company !== null,
  });

  const stakeholders = useMemo<CapitalCompany[]>(() => {
    if (!company) {
      return [];
    }
    return (capitalQuery.data ?? []).filter(
      (item) => Number(item.company_id) === company.id
    );
  }, [capitalQuery.data, company]);

  const createMutation = useMutation({
    mutationFn: async (input: {
      company_id: number;
      stakeholder_name: string;
      capital: number;
    }) => {
      const res = await createCapitalCompany(input);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<CapitalCompany[]>(
        cfoQueryKeys.capitalCompanies,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.capitalCompanies,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      company_id: number;
      stakeholder_name: string;
      capital: number;
    }) => {
      const res = await updateCapitalCompany(input.id, {
        company_id: input.company_id,
        stakeholder_name: input.stakeholder_name,
        capital: input.capital,
      });
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CapitalCompany[]>(
        cfoQueryKeys.capitalCompanies,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.capitalCompanies,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteCapitalCompany(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<CapitalCompany[]>(
        cfoQueryKeys.capitalCompanies,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.capitalCompanies,
      });
    },
  });

  const create = useCallback(
    async (
      stakeholderName: string,
      capital: number
    ): Promise<CapitalCompany | null> => {
      if (!company) {
        return null;
      }
      setMutationError(null);
      try {
        return await createMutation.mutateAsync({
          company_id: company.id,
          stakeholder_name: stakeholderName,
          capital,
        });
      } catch (err) {
        setMutationError(
          getErrorMessage(err, 'Gagal menambahkan pemegang saham.')
        );
        return null;
      }
    },
    [company, createMutation]
  );

  const update = useCallback(
    async (
      id: number,
      stakeholderName: string,
      capital: number
    ): Promise<CapitalCompany | null> => {
      if (!company) {
        return null;
      }
      setMutationError(null);
      try {
        return await updateMutation.mutateAsync({
          id,
          company_id: company.id,
          stakeholder_name: stakeholderName,
          capital,
        });
      } catch (err) {
        setMutationError(
          getErrorMessage(err, 'Gagal memperbarui pemegang saham.')
        );
        return null;
      }
    },
    [company, updateMutation]
  );

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      setMutationError(null);
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        setMutationError(
          getErrorMessage(err, 'Gagal menghapus pemegang saham.')
        );
        return false;
      }
    },
    [deleteMutation]
  );

  return {
    stakeholders,
    loading:
      capitalQuery.isLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error:
      mutationError ??
      getErrorMessage(capitalQuery.error, 'Gagal memuat data pemegang saham.'),
    create,
    update,
    remove,
  };
}

export interface ExpenseItemMutationInput {
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

export function useMasterOperasionalCrudResource(
  enabled: boolean,
  company: Company | null,
  options: { includeTypes?: boolean; includeItems?: boolean } = {}
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { includeTypes = true, includeItems = true } = options;

  const categoriesQuery = useQuery<ExpenseCategory[]>({
    queryKey: cfoQueryKeys.expenseCategories,
    queryFn: async () => {
      const res = await fetchExpenseCategories();
      return res?.data ?? [];
    },
    enabled,
  });

  const typesQuery = useQuery<ExpenseType[]>({
    queryKey: cfoQueryKeys.expenseTypes,
    queryFn: async () => {
      const res = await fetchExpenseTypes();
      return res?.data ?? [];
    },
    enabled: enabled && includeTypes,
  });

  const itemsQuery = useQuery<ExpenseItem[]>({
    queryKey: cfoQueryKeys.expenseItems,
    queryFn: async () => {
      const res = await fetchExpenseItems();
      return res?.data ?? [];
    },
    enabled: enabled && includeItems,
  });

  const allCategories = categoriesQuery.data ?? [];
  const allTypes = typesQuery.data ?? [];
  const allItems = itemsQuery.data ?? [];

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

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { company_id: number; name: string }) => {
      const res = await createExpenseCategory(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<ExpenseCategory[]>(
        cfoQueryKeys.expenseCategories,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseCategories,
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      company_id: number;
      name: string;
    }) => {
      const res = await updateExpenseCategory(input.id, {
        company_id: input.company_id,
        name: input.name,
      });
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ExpenseCategory[]>(
        cfoQueryKeys.expenseCategories,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseCategories,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseTypes,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteExpenseCategory(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<ExpenseCategory[]>(
        cfoQueryKeys.expenseCategories,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      queryClient.setQueryData<ExpenseType[]>(
        cfoQueryKeys.expenseTypes,
        (prev = []) =>
          prev.filter((item) => Number(item.expense_category_id) !== deletedId)
      );
      queryClient.setQueryData<ExpenseItem[]>(
        cfoQueryKeys.expenseItems,
        (prev = []) =>
          prev.filter((item) => Number(item.expense_category_id) !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseCategories,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseTypes,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: async (payload: {
      company_id: number;
      expense_category_id: number;
      name: string;
    }) => {
      const res = await createExpenseType(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<ExpenseType[]>(
        cfoQueryKeys.expenseTypes,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseTypes,
      });
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      company_id: number;
      expense_category_id: number;
      name: string;
    }) => {
      const res = await updateExpenseType(input.id, {
        company_id: input.company_id,
        expense_category_id: input.expense_category_id,
        name: input.name,
      });
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ExpenseType[]>(
        cfoQueryKeys.expenseTypes,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseTypes,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteExpenseType(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<ExpenseType[]>(
        cfoQueryKeys.expenseTypes,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      queryClient.setQueryData<ExpenseItem[]>(
        cfoQueryKeys.expenseItems,
        (prev = []) =>
          prev.filter((item) => Number(item.expense_type_id) !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseTypes,
      });
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
    },
  });

  const buildExpenseItemPayload = useCallback(
    (input: ExpenseItemMutationInput) => {
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

  const createItemMutation = useMutation({
    mutationFn: async (
      payload: NonNullable<ReturnType<typeof buildExpenseItemPayload>>
    ) => {
      const res = await createExpenseItem(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<ExpenseItem[]>(
        cfoQueryKeys.expenseItems,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      payload: NonNullable<ReturnType<typeof buildExpenseItemPayload>>;
    }) => {
      const res = await updateExpenseItem(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ExpenseItem[]>(
        cfoQueryKeys.expenseItems,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteExpenseItem(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<ExpenseItem[]>(
        cfoQueryKeys.expenseItems,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.expenseItems,
      });
    },
  });

  const createCategory = useCallback(
    async (name: string, companyId?: number) => {
      const resolvedCompanyId = companyId ?? company?.id;
      if (!resolvedCompanyId) return null;
      setMutationError(null);
      try {
        return await createCategoryMutation.mutateAsync({
          company_id: resolvedCompanyId,
          name,
        });
      } catch (err) {
        setMutationError(
          getErrorMessage(err, 'Gagal menambahkan kategori.')
        );
        return null;
      }
    },
    [company, createCategoryMutation]
  );

  const updateCategory = useCallback(
    async (id: number, name: string, companyId?: number) => {
      const resolvedCompanyId = companyId ?? company?.id;
      if (!resolvedCompanyId) return null;
      setMutationError(null);
      try {
        return await updateCategoryMutation.mutateAsync({
          id,
          company_id: resolvedCompanyId,
          name,
        });
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal memperbarui kategori.'));
        return null;
      }
    },
    [company, updateCategoryMutation]
  );

  const removeCategory = useCallback(
    async (id: number) => {
      setMutationError(null);
      try {
        await deleteCategoryMutation.mutateAsync(id);
        return true;
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menghapus kategori.'));
        return false;
      }
    },
    [deleteCategoryMutation]
  );

  const createType = useCallback(
    async (expenseCategoryId: number, name: string, companyId?: number) => {
      const resolvedCompanyId = companyId ?? company?.id;
      if (!resolvedCompanyId) return null;
      setMutationError(null);
      try {
        return await createTypeMutation.mutateAsync({
          company_id: resolvedCompanyId,
          expense_category_id: expenseCategoryId,
          name,
        });
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menambahkan tipe.'));
        return null;
      }
    },
    [company, createTypeMutation]
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
      setMutationError(null);
      try {
        return await updateTypeMutation.mutateAsync({
          id,
          company_id: resolvedCompanyId,
          expense_category_id: expenseCategoryId,
          name,
        });
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal memperbarui tipe.'));
        return null;
      }
    },
    [company, updateTypeMutation]
  );

  const removeType = useCallback(
    async (id: number) => {
      setMutationError(null);
      try {
        await deleteTypeMutation.mutateAsync(id);
        return true;
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menghapus tipe.'));
        return false;
      }
    },
    [deleteTypeMutation]
  );

  const createItem = useCallback(
    async (input: ExpenseItemMutationInput) => {
      const payload = buildExpenseItemPayload(input);
      if (!payload) return null;
      setMutationError(null);
      try {
        return await createItemMutation.mutateAsync(payload);
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menambahkan item.'));
        return null;
      }
    },
    [buildExpenseItemPayload, createItemMutation]
  );

  const updateItem = useCallback(
    async (id: number, input: ExpenseItemMutationInput) => {
      const payload = buildExpenseItemPayload(input);
      if (!payload) return null;
      setMutationError(null);
      try {
        return await updateItemMutation.mutateAsync({ id, payload });
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal memperbarui item.'));
        return null;
      }
    },
    [buildExpenseItemPayload, updateItemMutation]
  );

  const removeItem = useCallback(
    async (id: number) => {
      setMutationError(null);
      try {
        await deleteItemMutation.mutateAsync(id);
        return true;
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menghapus item.'));
        return false;
      }
    },
    [deleteItemMutation]
  );

  const loading =
    categoriesQuery.isLoading ||
    typesQuery.isLoading ||
    itemsQuery.isLoading ||
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    deleteCategoryMutation.isPending ||
    createTypeMutation.isPending ||
    updateTypeMutation.isPending ||
    deleteTypeMutation.isPending ||
    createItemMutation.isPending ||
    updateItemMutation.isPending ||
    deleteItemMutation.isPending;

  const queryError =
    categoriesQuery.error ?? typesQuery.error ?? itemsQuery.error;

  return {
    allCategories,
    allTypes,
    allItems,
    categories,
    types,
    items,
    loading,
    error:
      mutationError ??
      getErrorMessage(queryError, 'Gagal memuat data master operasional.'),
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

export interface CompanyAssetMutationInput {
  companyId?: number;
  assetDate: string;
  name: string;
  amount: number;
  pricePerUnit: number;
}

export function useCompanyAssetMutationResource(company: Company | null) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (payload: CompanyAssetPayload) => {
      const res = await createCompanyAsset(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<CompanyAsset[]>(
        cfoQueryKeys.companyAssets,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.companyAssets,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      payload: CompanyAssetPayload;
    }) => {
      const res = await updateCompanyAsset(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CompanyAsset[]>(
        cfoQueryKeys.companyAssets,
        (prev = []) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.companyAssets,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteCompanyAsset(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<CompanyAsset[]>(
        cfoQueryKeys.companyAssets,
        (prev = []) => prev.filter((item) => item.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: cfoQueryKeys.companyAssets,
      });
    },
  });

  const buildPayload = useCallback(
    (input: CompanyAssetMutationInput): CompanyAssetPayload | null => {
      const resolvedCompanyId = input.companyId ?? company?.id;
      if (!resolvedCompanyId) {
        return null;
      }
      return {
        company_id: resolvedCompanyId,
        asset_date: input.assetDate,
        name: input.name,
        amount: input.amount,
        price_per_unit: input.pricePerUnit,
      };
    },
    [company]
  );

  const createAsset = useCallback(
    async (input: CompanyAssetMutationInput) => {
      const payload = buildPayload(input);
      if (!payload) return null;
      setMutationError(null);
      try {
        return await createMutation.mutateAsync(payload);
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menambahkan aset.'));
        return null;
      }
    },
    [buildPayload, createMutation]
  );

  const updateAsset = useCallback(
    async (id: number, input: CompanyAssetMutationInput) => {
      const payload = buildPayload(input);
      if (!payload) return null;
      setMutationError(null);
      try {
        return await updateMutation.mutateAsync({ id, payload });
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal memperbarui aset.'));
        return null;
      }
    },
    [buildPayload, updateMutation]
  );

  const removeAsset = useCallback(
    async (id: number) => {
      setMutationError(null);
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (err) {
        setMutationError(getErrorMessage(err, 'Gagal menghapus aset.'));
        return false;
      }
    },
    [deleteMutation]
  );

  return {
    mutationLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error: mutationError,
    createAsset,
    updateAsset,
    removeAsset,
  };
}

export function useCompanyAssetCrudResource(
  enabled: boolean,
  company: Company | null
) {
  const assetsQuery = useQuery<CompanyAsset[]>({
    queryKey: cfoQueryKeys.companyAssets,
    queryFn: async () => {
      const res = await fetchCompanyAssets();
      return res?.data ?? [];
    },
    enabled,
  });
  const mutations = useCompanyAssetMutationResource(company);
  const allAssets = assetsQuery.data ?? [];

  const assets = useMemo<CompanyAsset[]>(() => {
    if (!company) {
      return allAssets;
    }
    return allAssets.filter(
      (asset) => Number(asset.company_id) === company.id
    );
  }, [allAssets, company]);

  return {
    allAssets,
    assets,
    loading:
      assetsQuery.isLoading || mutations.mutationLoading,
    error:
      mutations.error ??
      getErrorMessage(assetsQuery.error, 'Gagal memuat data aset perusahaan.'),
    createAsset: mutations.createAsset,
    updateAsset: mutations.updateAsset,
    removeAsset: mutations.removeAsset,
  };
}
