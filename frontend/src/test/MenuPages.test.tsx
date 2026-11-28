import { describe, expect, it } from 'vitest';
import { COMPANY_MENU_MODULES } from '../components/ui/DashboardHeader';
import {
  getDashboardMenuCompanyId,
  getDashboardMenuPage,
  getDashboardMenuRoute,
} from '../pages/menuPages';

describe('Dashboard menu pages', () => {
  it('resolves a page for every selectable menu leaf', () => {
    COMPANY_MENU_MODULES.forEach((module) => {
      module.items.forEach((menuItem) => {
        const selectableItems = menuItem.children?.length
          ? menuItem.children
          : [undefined];

        selectableItems.forEach((childItem) => {
          const route = getDashboardMenuRoute(
            1,
            module.code,
            menuItem,
            childItem
          );
          expect(getDashboardMenuPage(route), route).not.toBeNull();
          expect(getDashboardMenuCompanyId(route)).toBe(1);
        });
      });
    });
  });

  it('resolves CDO and CMO overview routes', () => {
    const cdoMenu = COMPANY_MENU_MODULES.find(
      (module) => module.code === 'CDO'
    )?.items[0];
    const cmoMenu = COMPANY_MENU_MODULES.find(
      (module) => module.code === 'CMO'
    )?.items[0];
    if (!cdoMenu || !cmoMenu) {
      throw new Error('CDO and CMO overview menus must be configured');
    }

    expect(
      getDashboardMenuPage(getDashboardMenuRoute(1, 'CDO', cdoMenu))
    ).not.toBeNull();
    expect(
      getDashboardMenuPage(getDashboardMenuRoute(1, 'CMO', cmoMenu))
    ).not.toBeNull();
  });

  it('places Kelola Vendor at CPO top level and groups package pages under Input Paket', () => {
    const cpoMenu = COMPANY_MENU_MODULES.find(
      (module) => module.code === 'CPO'
    );
    const kelolaVendorItem = cpoMenu?.items.find(
      (menuItem) => menuItem.code === 'KELOLA_VENDOR'
    );
    const paketMenu = cpoMenu?.items.find(
      (menuItem) => menuItem.code === 'INPUT_PAKET'
    );
    const paketChildren = paketMenu?.children ?? [];
    const paketAwalItem = paketChildren.find(
      (childItem) => childItem.code === 'MASTER_PAKET_PAKET_AWAL'
    );

    expect(kelolaVendorItem).toEqual({
      code: 'KELOLA_VENDOR',
      title: 'Kelola Vendor',
    });
    expect(
      paketChildren.map((childItem) => childItem.code)
    ).toEqual(['MASTER_PAKET_PAKET_AWAL', 'VIEW_PAKET_AWAL']);
    expect(paketAwalItem?.title).toBe('Master Paket - Paket Awal');
    expect(
      paketMenu && paketAwalItem
        ? getDashboardMenuPage(
            getDashboardMenuRoute(1, 'CPO', paketMenu, paketAwalItem)
          )
        : null
    ).not.toBeNull();
    expect(
      kelolaVendorItem
        ? getDashboardMenuPage(
            getDashboardMenuRoute(1, 'CPO', kelolaVendorItem)
          )
        : null
    ).not.toBeNull();
  });
});
