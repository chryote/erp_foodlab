import type { Company, Item, ItemPacket, Packet } from '@/api/client';

export interface GroupedItemPacketRow {
  id: number;
  group_key: string;
  company_id: number;
  packet_id: number;
  company?: Company | null;
  packet?: Packet | null;
  item_packets: ItemPacket[];
  total_quantity: number;
}

export function formatPackingItemLabel(item: Item): string {
  return item.code ? `${item.name} (${item.code})` : item.name;
}

export function groupItemPacketsByCompanyAndPacket(
  itemPackets: ItemPacket[],
  companiesById: Map<number, Company>,
  packetsById: Map<number, Packet>
): GroupedItemPacketRow[] {
  const groups = new Map<string, GroupedItemPacketRow>();

  for (const itemPacket of itemPackets) {
    const companyId = Number(itemPacket.company_id);
    const packetId = Number(itemPacket.packet_id);
    const groupKey = `${companyId}:${packetId}`;
    const quantity = Number(itemPacket.quantity ?? 0) || 0;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.item_packets.push(itemPacket);
      existing.total_quantity += quantity;
      if (!existing.company) {
        existing.company =
          companiesById.get(companyId) ?? itemPacket.company ?? null;
      }
      if (!existing.packet) {
        existing.packet =
          packetsById.get(packetId) ?? itemPacket.packet ?? null;
      }
    } else {
      groups.set(groupKey, {
        id: Number(itemPacket.id),
        group_key: groupKey,
        company_id: companyId,
        packet_id: packetId,
        company: companiesById.get(companyId) ?? itemPacket.company ?? null,
        packet: packetsById.get(packetId) ?? itemPacket.packet ?? null,
        item_packets: [itemPacket],
        total_quantity: quantity,
      });
    }
  }

  for (const group of groups.values()) {
    group.item_packets.sort((a, b) => a.id - b.id);
  }

  return Array.from(groups.values());
}
