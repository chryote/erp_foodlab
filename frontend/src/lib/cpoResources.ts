import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiRequestError,
  type Company,
  type Item,
  type ItemPacket,
  type ItemPacketPayload,
  type ItemPayload,
  type Packet,
  type PacketPayload,
  createItem,
  createItemPacket,
  createPacket,
  deleteItem,
  deleteItemPacket,
  deletePacket,
  fetchItemPackets,
  fetchItems,
  fetchPackets,
  updateItem,
  updateItemPacket,
  updatePacket,
} from '@/api/client';

export const cpoQueryKeys = {
  items: ['cpo', 'items'] as const,
  packets: ['cpo', 'packets'] as const,
  itemPackets: ['cpo', 'item-packets'] as const,
};

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

export function useMasterPackingCrudResource(
  enabled: boolean,
  company: Company | null
) {
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const itemsQuery = useQuery<Item[]>({
    queryKey: cpoQueryKeys.items,
    queryFn: async () => {
      const res = await fetchItems();
      return res?.data ?? [];
    },
    enabled,
  });

  const packetsQuery = useQuery<Packet[]>({
    queryKey: cpoQueryKeys.packets,
    queryFn: async () => {
      const res = await fetchPackets();
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

  const allItems = itemsQuery.data ?? [];
  const allPackets = packetsQuery.data ?? [];
  const allItemPackets = itemPacketsQuery.data ?? [];

  const items = useMemo<Item[]>(() => {
    if (!company) {
      return allItems;
    }
    return allItems.filter((item) => Number(item.company_id) === company.id);
  }, [allItems, company]);

  const itemPackets = useMemo<ItemPacket[]>(() => {
    if (!company) {
      return allItemPackets;
    }
    return allItemPackets.filter(
      (assignment) => Number(assignment.company_id) === company.id
    );
  }, [allItemPackets, company]);

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

  // Item mutations
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
    itemsQuery.isLoading ||
    packetsQuery.isLoading ||
    itemPacketsQuery.isLoading ||
    createItemMutation.isPending ||
    updateItemMutation.isPending ||
    deleteItemMutation.isPending ||
    createPacketMutation.isPending ||
    updatePacketMutation.isPending ||
    deletePacketMutation.isPending ||
    createItemPacketMutation.isPending ||
    updateItemPacketMutation.isPending ||
    deleteItemPacketMutation.isPending;

  const queryError =
    itemsQuery.error ?? packetsQuery.error ?? itemPacketsQuery.error;

  return {
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
    createItem: addItem,
    updateItem: editItem,
    removeItem,
    createPacket: addPacket,
    updatePacket: editPacket,
    removePacket,
    createItemPacket: addItemPacket,
    updateItemPacket: editItemPacket,
    removeItemPacket,
  };
}
