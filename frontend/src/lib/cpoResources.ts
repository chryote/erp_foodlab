import { useCallback, useMemo, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ApiRequestError,
  type Company,
  type CpoEnums,
  type DefaultPackage,
  type DefaultPackagePayload,
  type DefaultPackageWizardPayload,
  type Ingredient,
  type IngredientPayload,
  type Item,
  type ItemPacket,
  type ItemPacketPayload,
  type ItemPayload,
  type Packet,
  type PacketCategory,
  type PacketCategoryPayload,
  type PacketName,
  type PacketNamePayload,
  type PacketPayload,
  type PacketVendor,
  type PacketVendorPayload,
  createDefaultPackage,
  createDefaultPackageWizard,
  createIngredient,
  createItem,
  createItemPacket,
  createPacket,
  createPacketCategory,
  createPacketName,
  createPacketVendor,
  deleteDefaultPackage,
  deleteIngredient,
  deleteItem,
  deleteItemPacket,
  deletePacket,
  deletePacketCategory,
  deletePacketName,
  deletePacketVendor,
  fetchCpoEnums,
  fetchDefaultPackages,
  fetchIngredients,
  fetchItemPackets,
  fetchItems,
  fetchPacketCategories,
  fetchPacketNames,
  fetchPacketVendors,
  fetchPackets,
  updateDefaultPackage,
  updateDefaultPackageWizard,
  updateIngredient,
  updateItem,
  updateItemPacket,
  updatePacket,
  updatePacketCategory,
  updatePacketName,
  updatePacketVendor,
} from '@/api/client';

export const DEFAULT_CPO_ENUMS: CpoEnums = {
  item_type: [
    { value: 'Bahan', nama: 'Bahan' },
    { value: 'Kelengkapan', nama: 'Kelengkapan' },
    { value: 'Sarpras', nama: 'Sarpras' },
  ],
  packet_vendor_type: [
    { value: 'Bahan', nama: 'Bahan' },
    { value: 'Kelengkapan', nama: 'Kelengkapan' },
    { value: 'Sarpras', nama: 'Sarpras' },
  ],
};

export const cpoQueryKeys = {
  enums: ['cpo', 'enums'] as const,
  items: ['cpo', 'items'] as const,
  packets: ['cpo', 'packets'] as const,
  itemPackets: ['cpo', 'item-packets'] as const,
  packetNames: ['cpo', 'packet-names'] as const,
  packetVendors: ['cpo', 'packet-vendors'] as const,
  packetCategories: ['cpo', 'packet-categories'] as const,
  defaultPackages: ['cpo', 'default-packages'] as const,
  ingredients: ['cpo', 'ingredients'] as const,
};

export const CPO_LIST_PAGE_SIZE = 10;

function getNextCpoListPage<T>(
  response: { data: T[]; meta: { last_page?: number } },
  page: number
): number | undefined {
  if (response.meta.last_page !== undefined) {
    return page < response.meta.last_page ? page + 1 : undefined;
  }
  return response.data.length === CPO_LIST_PAGE_SIZE ? page + 1 : undefined;
}

export function useInfiniteItemsQuery(
  companyId: number | null,
  sort: string,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [...cpoQueryKeys.items, 'infinite', companyId, sort],
    queryFn: ({ pageParam }) =>
      fetchItems({
        page: pageParam,
        per_page: CPO_LIST_PAGE_SIZE,
        company_id: companyId ?? undefined,
        sort,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextCpoListPage(lastPage, lastPageParam),
    enabled: enabled && companyId !== null,
  });
}

export function useInfinitePacketsQuery(sort: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...cpoQueryKeys.packets, 'infinite', sort],
    queryFn: ({ pageParam }) =>
      fetchPackets({
        page: pageParam,
        per_page: CPO_LIST_PAGE_SIZE,
        sort,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextCpoListPage(lastPage, lastPageParam),
    enabled,
  });
}

export function useInfiniteItemPacketsQuery(
  companyId: number | null,
  sort: string,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [...cpoQueryKeys.itemPackets, 'infinite', companyId, sort],
    queryFn: ({ pageParam }) =>
      fetchItemPackets({
        page: pageParam,
        per_page: CPO_LIST_PAGE_SIZE,
        company_id: companyId ?? undefined,
        sort,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      getNextCpoListPage(lastPage, lastPageParam),
    enabled: enabled && companyId !== null,
  });
}

function getErrorMessage(err: unknown, fallback: string): string | null {
  if (!err) {
    return null;
  }
  if (err instanceof ApiRequestError && err.errors) {
    const flat = Object.values(err.errors).flat().filter(Boolean);
    if (flat.length > 0) {
      return flat.join(' ');
    }
  }
  return err instanceof Error ? err.message : fallback;
}

export function useCpoEnumsResource(enabled: boolean) {
  const enumsQuery = useQuery<CpoEnums>({
    queryKey: cpoQueryKeys.enums,
    queryFn: async () => {
      const res = await fetchCpoEnums();
      return res?.data ?? DEFAULT_CPO_ENUMS;
    },
    enabled,
  });

  return {
    enums: enumsQuery.data ?? DEFAULT_CPO_ENUMS,
    loading: enumsQuery.isLoading,
  };
}

function useItemsCore(
  enabled: boolean,
  runMutation: <R>(fn: () => Promise<R>, fallback: string) => Promise<R | null>
) {
  const queryClient = useQueryClient();

  const itemsQuery = useQuery<Item[]>({
    queryKey: cpoQueryKeys.items,
    queryFn: async () => {
      const res = await fetchItems();
      return res?.data ?? [];
    },
    enabled,
  });

  const createItemMutation = useMutation({
    mutationFn: async (payload: ItemPayload) => {
      const res = await createItem(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Item[]>(cpoQueryKeys.items, (prev = []) => [
        created,
        ...prev,
      ]);
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.items });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (input: { id: number; payload: ItemPayload }) => {
      const res = await updateItem(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Item[]>(cpoQueryKeys.items, (prev = []) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.items });
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.itemPackets,
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteItem(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Item[]>(cpoQueryKeys.items, (prev = []) =>
        prev.filter((item) => item.id !== deletedId)
      );
      queryClient.setQueryData<ItemPacket[]>(
        cpoQueryKeys.itemPackets,
        (prev = []) =>
          prev.filter((assignment) => Number(assignment.item_id) !== deletedId)
      );
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.items });
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.itemPackets,
      });
    },
  });

  const addItem = useCallback(
    (payload: ItemPayload) =>
      runMutation(
        () => createItemMutation.mutateAsync(payload),
        'Gagal menambahkan item.'
      ),
    [createItemMutation, runMutation]
  );

  const editItem = useCallback(
    (id: number, payload: ItemPayload) =>
      runMutation(
        () => updateItemMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui item.'
      ),
    [runMutation, updateItemMutation]
  );

  const removeItem = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteItemMutation.mutateAsync(id),
        'Gagal menghapus item.'
      )) !== null,
    [deleteItemMutation, runMutation]
  );

  return {
    allItems: itemsQuery.data ?? [],
    isLoading:
      itemsQuery.isLoading ||
      createItemMutation.isPending ||
      updateItemMutation.isPending ||
      deleteItemMutation.isPending,
    error: itemsQuery.error,
    createItem: addItem,
    updateItem: editItem,
    removeItem,
  };
}

export function useItemCrudResource(enabled: boolean) {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const enumsResource = useCpoEnumsResource(enabled);

  const packetVendorsQuery = useQuery<PacketVendor[]>({
    queryKey: cpoQueryKeys.packetVendors,
    queryFn: async () => {
      const res = await fetchPacketVendors();
      return res?.data ?? [];
    },
    enabled,
  });

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackError: string): Promise<T | null> => {
      setMutationError(null);
      try {
        return await fn();
      } catch (err) {
        setMutationError(getErrorMessage(err, fallbackError));
        return null;
      }
    },
    []
  );

  const itemsCore = useItemsCore(enabled, runMutation);

  return {
    enums: enumsResource.enums,
    allItems: itemsCore.allItems,
    allPacketVendors: packetVendorsQuery.data ?? [],
    loading: itemsCore.isLoading || packetVendorsQuery.isLoading,
    error:
      mutationError ??
      getErrorMessage(itemsCore.error, 'Gagal memuat data item vendor.') ??
      getErrorMessage(packetVendorsQuery.error, 'Gagal memuat data vendor.'),
    clearError: useCallback(() => setMutationError(null), []),
    createItem: itemsCore.createItem,
    updateItem: itemsCore.updateItem,
    removeItem: itemsCore.removeItem,
  };
}

export function useMasterPackingCrudResource(
  enabled: boolean,
  company: Company | null,
  loadLists = true
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const enumsResource = useCpoEnumsResource(enabled);

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackError: string): Promise<T | null> => {
      setMutationError(null);
      try {
        return await fn();
      } catch (err) {
        setMutationError(getErrorMessage(err, fallbackError));
        return null;
      }
    },
    []
  );

  const itemsCore = useItemsCore(enabled && loadLists, runMutation);

  const packetsQuery = useQuery<Packet[]>({
    queryKey: cpoQueryKeys.packets,
    queryFn: async () => {
      const res = await fetchPackets();
      return res?.data ?? [];
    },
    enabled: enabled && loadLists,
  });

  const itemPacketsQuery = useQuery<ItemPacket[]>({
    queryKey: cpoQueryKeys.itemPackets,
    queryFn: async () => {
      const res = await fetchItemPackets();
      return res?.data ?? [];
    },
    enabled: enabled && loadLists,
  });

  const allItems = itemsCore.allItems;
  const allPackets = packetsQuery.data ?? [];
  const allItemPackets = itemPacketsQuery.data ?? [];

  const items = useMemo<Item[]>(() => {
    if (!company) {
      return allItems;
    }
    return allItems.filter(
      (item) =>
        item.company_id !== null && Number(item.company_id) === company.id
    );
  }, [allItems, company]);

  const itemPackets = useMemo<ItemPacket[]>(() => {
    if (!company) {
      return allItemPackets;
    }
    return allItemPackets.filter(
      (assignment) =>
        assignment.company_id !== null &&
        Number(assignment.company_id) === company.id
    );
  }, [allItemPackets, company]);

  // Packet mutations
  const createPacketMutation = useMutation({
    mutationFn: async (payload: PacketPayload) => {
      const res = await createPacket(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Packet[]>(cpoQueryKeys.packets, (prev = []) => [
        created,
        ...prev,
      ]);
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.packets });
    },
  });

  const updatePacketMutation = useMutation({
    mutationFn: async (input: { id: number; payload: PacketPayload }) => {
      const res = await updatePacket(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Packet[]>(cpoQueryKeys.packets, (prev = []) =>
        prev.map((packet) => (packet.id === updated.id ? updated : packet))
      );
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.packets });
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.itemPackets,
      });
    },
  });

  const deletePacketMutation = useMutation({
    mutationFn: async (id: number) => {
      await deletePacket(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Packet[]>(cpoQueryKeys.packets, (prev = []) =>
        prev.filter((packet) => packet.id !== deletedId)
      );
      queryClient.setQueryData<ItemPacket[]>(
        cpoQueryKeys.itemPackets,
        (prev = []) =>
          prev.filter(
            (assignment) => Number(assignment.packet_id) !== deletedId
          )
      );
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.packets });
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.itemPackets,
      });
    },
  });

  // ItemPacket assignment mutations
  const createItemPacketMutation = useMutation({
    mutationFn: async (payload: ItemPacketPayload) => {
      const res = await createItemPacket(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<ItemPacket[]>(
        cpoQueryKeys.itemPackets,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.itemPackets,
      });
    },
  });

  const updateItemPacketMutation = useMutation({
    mutationFn: async (input: { id: number; payload: ItemPacketPayload }) => {
      const res = await updateItemPacket(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ItemPacket[]>(
        cpoQueryKeys.itemPackets,
        (prev = []) =>
          prev.map((assignment) =>
            assignment.id === updated.id ? updated : assignment
          )
      );
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.itemPackets,
      });
    },
  });

  const deleteItemPacketMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteItemPacket(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<ItemPacket[]>(
        cpoQueryKeys.itemPackets,
        (prev = []) => prev.filter((assignment) => assignment.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.itemPackets,
      });
    },
  });

  const addPacket = useCallback(
    (payload: PacketPayload) =>
      runMutation(
        () => createPacketMutation.mutateAsync(payload),
        'Gagal menambahkan paket.'
      ),
    [createPacketMutation, runMutation]
  );

  const editPacket = useCallback(
    (id: number, payload: PacketPayload) =>
      runMutation(
        () => updatePacketMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui paket.'
      ),
    [runMutation, updatePacketMutation]
  );

  const removePacket = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deletePacketMutation.mutateAsync(id),
        'Gagal menghapus paket.'
      )) !== null,
    [deletePacketMutation, runMutation]
  );

  const addItemPacket = useCallback(
    (payload: ItemPacketPayload) =>
      runMutation(
        () => createItemPacketMutation.mutateAsync(payload),
        'Gagal menambahkan item paket.'
      ),
    [createItemPacketMutation, runMutation]
  );

  const editItemPacket = useCallback(
    (id: number, payload: ItemPacketPayload) =>
      runMutation(
        () => updateItemPacketMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui item paket.'
      ),
    [runMutation, updateItemPacketMutation]
  );

  const removeItemPacket = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteItemPacketMutation.mutateAsync(id),
        'Gagal menghapus item paket.'
      )) !== null,
    [deleteItemPacketMutation, runMutation]
  );

  const loading =
    itemsCore.isLoading ||
    packetsQuery.isLoading ||
    itemPacketsQuery.isLoading ||
    createPacketMutation.isPending ||
    updatePacketMutation.isPending ||
    deletePacketMutation.isPending ||
    createItemPacketMutation.isPending ||
    updateItemPacketMutation.isPending ||
    deleteItemPacketMutation.isPending;

  const queryError =
    itemsCore.error ?? packetsQuery.error ?? itemPacketsQuery.error;

  return {
    enums: enumsResource.enums,
    allItems,
    allPackets,
    allItemPackets,
    items,
    packets: allPackets,
    itemPackets,
    loading,
    error:
      mutationError ??
      getErrorMessage(queryError, 'Gagal memuat data master packing.'),
    clearError: useCallback(() => setMutationError(null), []),
    createItem: itemsCore.createItem,
    updateItem: itemsCore.updateItem,
    removeItem: itemsCore.removeItem,
    createPacket: addPacket,
    updatePacket: editPacket,
    removePacket,
    createItemPacket: addItemPacket,
    updateItemPacket: editItemPacket,
    removeItemPacket,
  };
}

function useNamedCpoEntity<T extends { id: number; name: string }>(
  queryKey: readonly string[],
  enabled: boolean,
  api: {
    fetchAll: () => Promise<{ data: T[] }>;
    create: (payload: { name: string }) => Promise<{ data: T }>;
    update: (id: number, payload: { name: string }) => Promise<{ data: T }>;
    remove: (id: number) => Promise<{ message: string }>;
  },
  messages: { create: string; update: string; remove: string },
  runMutation: <R>(fn: () => Promise<R>, fallback: string) => Promise<R | null>
) {
  const queryClient = useQueryClient();

  const query = useQuery<T[]>({
    queryKey,
    queryFn: async () => {
      const res = await api.fetchAll();
      return res?.data ?? [];
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      const res = await api.create(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<T[]>(queryKey, (prev = []) => [created, ...prev]);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.defaultPackages,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: number; payload: { name: string } }) => {
      const res = await api.update(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<T[]>(queryKey, (prev = []) =>
        prev.map((row) => (row.id === updated.id ? updated : row))
      );
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.defaultPackages,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.remove(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<T[]>(queryKey, (prev = []) =>
        prev.filter((row) => row.id !== deletedId)
      );
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.defaultPackages,
      });
    },
  });

  const add = useCallback(
    (payload: { name: string }) =>
      runMutation(() => createMutation.mutateAsync(payload), messages.create),
    [createMutation, messages.create, runMutation]
  );

  const edit = useCallback(
    (id: number, payload: { name: string }) =>
      runMutation(
        () => updateMutation.mutateAsync({ id, payload }),
        messages.update
      ),
    [messages.update, runMutation, updateMutation]
  );

  const remove = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteMutation.mutateAsync(id),
        messages.remove
      )) !== null,
    [deleteMutation, messages.remove, runMutation]
  );

  return {
    items: query.data ?? [],
    isLoading:
      query.isLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error: query.error,
    create: add,
    update: edit,
    remove,
  };
}

export function useMasterPaketCrudResource(enabled: boolean) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const enumsResource = useCpoEnumsResource(enabled);

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackError: string): Promise<T | null> => {
      setMutationError(null);
      try {
        return await fn();
      } catch (err) {
        setMutationError(getErrorMessage(err, fallbackError));
        return null;
      }
    },
    []
  );

  const packetNames = useNamedCpoEntity<PacketName>(
    cpoQueryKeys.packetNames,
    enabled,
    {
      fetchAll: fetchPacketNames,
      create: (payload: PacketNamePayload) => createPacketName(payload),
      update: (id, payload: PacketNamePayload) => updatePacketName(id, payload),
      remove: deletePacketName,
    },
    {
      create: 'Gagal menambahkan nama paket.',
      update: 'Gagal memperbarui nama paket.',
      remove: 'Gagal menghapus nama paket.',
    },
    runMutation
  );

  const packetVendors = useNamedCpoEntity<PacketVendor>(
    cpoQueryKeys.packetVendors,
    enabled,
    {
      fetchAll: fetchPacketVendors,
      create: (payload: PacketVendorPayload) => createPacketVendor(payload),
      update: (id, payload: PacketVendorPayload) =>
        updatePacketVendor(id, payload),
      remove: deletePacketVendor,
    },
    {
      create: 'Gagal menambahkan vendor paket.',
      update: 'Gagal memperbarui vendor paket.',
      remove: 'Gagal menghapus vendor paket.',
    },
    runMutation
  );

  const packetCategories = useNamedCpoEntity<PacketCategory>(
    cpoQueryKeys.packetCategories,
    enabled,
    {
      fetchAll: fetchPacketCategories,
      create: (payload: PacketCategoryPayload) => createPacketCategory(payload),
      update: (id, payload: PacketCategoryPayload) =>
        updatePacketCategory(id, payload),
      remove: deletePacketCategory,
    },
    {
      create: 'Gagal menambahkan kategori paket.',
      update: 'Gagal memperbarui kategori paket.',
      remove: 'Gagal menghapus kategori paket.',
    },
    runMutation
  );

  const itemsQuery = useQuery<Item[]>({
    queryKey: cpoQueryKeys.items,
    queryFn: async () => {
      const res = await fetchItems();
      return res?.data ?? [];
    },
    enabled,
  });

  const itemPacketsQuery = useQuery<ItemPacket[]>({
    queryKey: cpoQueryKeys.itemPackets,
    queryFn: async () => {
      const res = await fetchItemPackets();
      return res?.data ?? [];
    },
    enabled,
  });

  const defaultPackagesQuery = useQuery<DefaultPackage[]>({
    queryKey: cpoQueryKeys.defaultPackages,
    queryFn: async () => {
      const res = await fetchDefaultPackages();
      return res?.data ?? [];
    },
    enabled,
  });

  const ingredientsQuery = useQuery<Ingredient[]>({
    queryKey: cpoQueryKeys.ingredients,
    queryFn: async () => {
      const res = await fetchIngredients();
      return res?.data ?? [];
    },
    enabled,
  });

  const invalidateWizardQueries = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: cpoQueryKeys.defaultPackages,
    });
    void queryClient.invalidateQueries({
      queryKey: cpoQueryKeys.packetNames,
    });
    void queryClient.invalidateQueries({
      queryKey: cpoQueryKeys.packetCategories,
    });
    void queryClient.invalidateQueries({
      queryKey: cpoQueryKeys.packets,
    });
    void queryClient.invalidateQueries({
      queryKey: cpoQueryKeys.itemPackets,
    });
    void queryClient.invalidateQueries({
      queryKey: cpoQueryKeys.ingredients,
    });
  }, [queryClient]);

  const createDefaultPackageWizardMutation = useMutation({
    mutationFn: async (payload: DefaultPackageWizardPayload) => {
      const res = await createDefaultPackageWizard(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<DefaultPackage[]>(
        cpoQueryKeys.defaultPackages,
        (prev = []) => [created, ...prev]
      );
      invalidateWizardQueries();
    },
  });

  const updateDefaultPackageWizardMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      payload: DefaultPackageWizardPayload;
    }) => {
      const res = await updateDefaultPackageWizard(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<DefaultPackage[]>(
        cpoQueryKeys.defaultPackages,
        (prev = []) =>
          prev.map((pkg) => (pkg.id === updated.id ? updated : pkg))
      );
      invalidateWizardQueries();
    },
  });

  const createDefaultPackageMutation = useMutation({
    mutationFn: async (payload: DefaultPackagePayload) => {
      const res = await createDefaultPackage(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<DefaultPackage[]>(
        cpoQueryKeys.defaultPackages,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.defaultPackages,
      });
    },
  });

  const updateDefaultPackageMutation = useMutation({
    mutationFn: async (input: {
      id: number;
      payload: DefaultPackagePayload;
    }) => {
      const res = await updateDefaultPackage(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<DefaultPackage[]>(
        cpoQueryKeys.defaultPackages,
        (prev = []) =>
          prev.map((pkg) => (pkg.id === updated.id ? updated : pkg))
      );
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.defaultPackages,
      });
    },
  });

  const deleteDefaultPackageMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteDefaultPackage(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<DefaultPackage[]>(
        cpoQueryKeys.defaultPackages,
        (prev = []) => prev.filter((pkg) => pkg.id !== deletedId)
      );
      void queryClient.invalidateQueries({
        queryKey: cpoQueryKeys.defaultPackages,
      });
    },
  });

  const addDefaultPackage = useCallback(
    (payload: DefaultPackagePayload) =>
      runMutation(
        () => createDefaultPackageMutation.mutateAsync(payload),
        'Gagal menambahkan paket awal.'
      ),
    [createDefaultPackageMutation, runMutation]
  );

  const addDefaultPackageWizard = useCallback(
    (payload: DefaultPackageWizardPayload) =>
      runMutation(
        () => createDefaultPackageWizardMutation.mutateAsync(payload),
        'Gagal menyimpan paket awal.'
      ),
    [createDefaultPackageWizardMutation, runMutation]
  );

  const editDefaultPackageWizard = useCallback(
    (id: number, payload: DefaultPackageWizardPayload) =>
      runMutation(
        () => updateDefaultPackageWizardMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui paket awal.'
      ),
    [runMutation, updateDefaultPackageWizardMutation]
  );

  const editDefaultPackage = useCallback(
    (id: number, payload: DefaultPackagePayload) =>
      runMutation(
        () => updateDefaultPackageMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui paket awal.'
      ),
    [runMutation, updateDefaultPackageMutation]
  );

  const removeDefaultPackage = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteDefaultPackageMutation.mutateAsync(id),
        'Gagal menghapus paket awal.'
      )) !== null,
    [deleteDefaultPackageMutation, runMutation]
  );

  const loading =
    packetNames.isLoading ||
    packetVendors.isLoading ||
    packetCategories.isLoading ||
    itemsQuery.isLoading ||
    itemPacketsQuery.isLoading ||
    defaultPackagesQuery.isLoading ||
    ingredientsQuery.isLoading ||
    createDefaultPackageMutation.isPending ||
    createDefaultPackageWizardMutation.isPending ||
    updateDefaultPackageWizardMutation.isPending ||
    updateDefaultPackageMutation.isPending ||
    deleteDefaultPackageMutation.isPending;

  const queryError =
    packetNames.error ??
    packetVendors.error ??
    packetCategories.error ??
    itemsQuery.error ??
    itemPacketsQuery.error ??
    defaultPackagesQuery.error ??
    ingredientsQuery.error;

  return {
    enums: enumsResource.enums,
    allPacketNames: packetNames.items,
    allPacketVendors: packetVendors.items,
    allPacketCategories: packetCategories.items,
    allItems: itemsQuery.data ?? [],
    allItemPackets: itemPacketsQuery.data ?? [],
    allDefaultPackages: defaultPackagesQuery.data ?? [],
    allIngredients: ingredientsQuery.data ?? [],
    loading,
    error:
      mutationError ??
      getErrorMessage(queryError, 'Gagal memuat data master paket.'),
    clearError: useCallback(() => setMutationError(null), []),
    createPacketName: packetNames.create,
    updatePacketName: packetNames.update,
    removePacketName: packetNames.remove,
    createPacketVendor: packetVendors.create,
    updatePacketVendor: packetVendors.update,
    removePacketVendor: packetVendors.remove,
    createPacketCategory: packetCategories.create,
    updatePacketCategory: packetCategories.update,
    removePacketCategory: packetCategories.remove,
    createDefaultPackage: addDefaultPackage,
    createDefaultPackageWizard: addDefaultPackageWizard,
    updateDefaultPackageWizard: editDefaultPackageWizard,
    updateDefaultPackage: editDefaultPackage,
    removeDefaultPackage,
  };
}

export function useIngredientCrudResource(enabled: boolean) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const runMutation = useCallback(
    async <T>(fn: () => Promise<T>, fallbackError: string): Promise<T | null> => {
      setMutationError(null);
      try {
        return await fn();
      } catch (err) {
        setMutationError(getErrorMessage(err, fallbackError));
        return null;
      }
    },
    []
  );

  const ingredientsQuery = useQuery<Ingredient[]>({
    queryKey: cpoQueryKeys.ingredients,
    queryFn: async () => {
      const res = await fetchIngredients();
      return res?.data ?? [];
    },
    enabled,
  });

  const defaultPackagesQuery = useQuery<DefaultPackage[]>({
    queryKey: cpoQueryKeys.defaultPackages,
    queryFn: async () => {
      const res = await fetchDefaultPackages();
      return res?.data ?? [];
    },
    enabled,
  });

  const itemPacketsQuery = useQuery<ItemPacket[]>({
    queryKey: cpoQueryKeys.itemPackets,
    queryFn: async () => {
      const res = await fetchItemPackets();
      return res?.data ?? [];
    },
    enabled,
  });

  const itemsQuery = useQuery<Item[]>({
    queryKey: cpoQueryKeys.items,
    queryFn: async () => {
      const res = await fetchItems();
      return res?.data ?? [];
    },
    enabled,
  });

  const createIngredientMutation = useMutation({
    mutationFn: async (payload: IngredientPayload) => {
      const res = await createIngredient(payload);
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Ingredient[]>(
        cpoQueryKeys.ingredients,
        (prev = []) => [created, ...prev]
      );
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.ingredients });
    },
  });

  const updateIngredientMutation = useMutation({
    mutationFn: async (input: { id: number; payload: IngredientPayload }) => {
      const res = await updateIngredient(input.id, input.payload);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Ingredient[]>(
        cpoQueryKeys.ingredients,
        (prev = []) =>
          prev.map((row) => (row.id === updated.id ? updated : row))
      );
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.ingredients });
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteIngredient(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Ingredient[]>(
        cpoQueryKeys.ingredients,
        (prev = []) => prev.filter((row) => row.id !== deletedId)
      );
      void queryClient.invalidateQueries({ queryKey: cpoQueryKeys.ingredients });
    },
  });

  const addIngredient = useCallback(
    (payload: IngredientPayload) =>
      runMutation(
        () => createIngredientMutation.mutateAsync(payload),
        'Gagal menambahkan bahan baku.'
      ),
    [createIngredientMutation, runMutation]
  );

  const editIngredient = useCallback(
    (id: number, payload: IngredientPayload) =>
      runMutation(
        () => updateIngredientMutation.mutateAsync({ id, payload }),
        'Gagal memperbarui bahan baku.'
      ),
    [runMutation, updateIngredientMutation]
  );

  const removeIngredient = useCallback(
    async (id: number) =>
      (await runMutation(
        () => deleteIngredientMutation.mutateAsync(id),
        'Gagal menghapus bahan baku.'
      )) !== null,
    [deleteIngredientMutation, runMutation]
  );

  const loading =
    ingredientsQuery.isLoading ||
    defaultPackagesQuery.isLoading ||
    itemPacketsQuery.isLoading ||
    itemsQuery.isLoading ||
    createIngredientMutation.isPending ||
    updateIngredientMutation.isPending ||
    deleteIngredientMutation.isPending;

  const queryError =
    ingredientsQuery.error ??
    defaultPackagesQuery.error ??
    itemPacketsQuery.error ??
    itemsQuery.error;

  return {
    allIngredients: ingredientsQuery.data ?? [],
    allDefaultPackages: defaultPackagesQuery.data ?? [],
    allItemPackets: itemPacketsQuery.data ?? [],
    allItems: itemsQuery.data ?? [],
    loading,
    error:
      mutationError ??
      getErrorMessage(queryError, 'Gagal memuat data master bahan baku.'),
    clearError: useCallback(() => setMutationError(null), []),
    createIngredient: addIngredient,
    updateIngredient: editIngredient,
    removeIngredient,
  };
}
