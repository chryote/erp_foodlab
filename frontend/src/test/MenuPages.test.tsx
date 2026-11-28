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
});
