import { describe, expect, it } from 'vitest';
import { COMPANY_MENU_MODULES } from '../components/ui/DashboardHeader';
import {
  getDashboardMenuCompanyId,
  getDashboardMenuPage,
  getDashboardMenuRoute,
} from '../pages/menuPages';

describe('Dashboard menu pages', () => {
  it('resolves a placeholder page for every selectable menu leaf', () => {
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
});
