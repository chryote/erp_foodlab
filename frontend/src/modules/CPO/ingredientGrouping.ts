import type {
  DefaultPackage,
  Ingredient,
  Item,
  ItemPacket,
} from '@/api/client';

export interface GroupedIngredientRow {
  id: number;
  default_package_id: number;
  default_package?: DefaultPackage | null;
  ingredients: Ingredient[];
  total_price: number;
}

export function formatDefaultPackageLabel(dp: DefaultPackage): string {
  const details = [dp.packet_name?.name, dp.packet_category?.name]
    .filter(Boolean)
    .join(' - ');
  return details ? `${dp.brand_name} (${details})` : dp.brand_name;
}

export function resolveDefaultPackageCompanyId(
  defaultPackage: DefaultPackage | undefined,
  allItemPackets: ItemPacket[]
): number | null {
  if (!defaultPackage) {
    return null;
  }
  const matchedItemPacket =
    allItemPackets.find(
      (ip) => Number(ip.id) === Number(defaultPackage.item_packet_id)
    ) ?? defaultPackage.item_packet;
  const companyId = matchedItemPacket?.company_id;
  return companyId !== undefined &&
    companyId !== null &&
    Number.isFinite(Number(companyId))
    ? Number(companyId)
    : null;
}

export function formatItemLabel(item: Item): string {
  return item.code ? `${item.name} (${item.code})` : item.name;
}

export function groupIngredientsByPackage(
  ingredients: Ingredient[],
  defaultPackagesById: Map<number, DefaultPackage>
): GroupedIngredientRow[] {
  const groups = new Map<number, GroupedIngredientRow>();

  for (const ing of ingredients) {
    const dpId = Number(ing.default_package_id);
    const price = Number(ing.price ?? 0) || 0;
    const existing = groups.get(dpId);

    if (existing) {
      existing.ingredients.push(ing);
      existing.total_price =
        Math.round((existing.total_price + price) * 100) / 100;
      if (!existing.default_package) {
        existing.default_package =
          defaultPackagesById.get(dpId) ?? ing.default_package ?? null;
      }
    } else {
      groups.set(dpId, {
        id: dpId,
        default_package_id: dpId,
        default_package:
          defaultPackagesById.get(dpId) ?? ing.default_package ?? null,
        ingredients: [ing],
        total_price: Math.round(price * 100) / 100,
      });
    }
  }

  for (const group of groups.values()) {
    group.ingredients.sort((a, b) => a.id - b.id);
  }

  return Array.from(groups.values());
}
