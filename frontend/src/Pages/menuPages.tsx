import type React from 'react';
import type { ErpModuleCode } from '@/api/client';
import type { HorizontalMenuItem } from '@/components/ui/HorizontalMenuCard';

const menuPages = import.meta.glob<{ default: React.ComponentType }>(
  './menu/**/*.tsx',
  { eager: true }
);

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const getDashboardMenuRoute = (
  companyId: number,
  moduleCode: ErpModuleCode,
  menuItem: HorizontalMenuItem,
  childItem?: HorizontalMenuItem
) =>
  `/dashboard/company/${companyId}/menu/${moduleCode}/${menuItem.code}/${childItem ? toSlug(childItem.title) : 'direct'}`;

export const getDashboardMenuCompanyId = (pathname: string) => {
  const match = pathname.match(/^\/dashboard\/company\/(\d+)\/menu\//);
  if (!match) {
    return null;
  }

  const companyId = Number(match[1]);
  return Number.isSafeInteger(companyId) && companyId > 0 ? companyId : null;
};

export const getDashboardMenuPage = (pathname: string) => {
  const [, , companySegment, companyId, menuSegment, moduleCode, menuCode, itemSlug] =
    pathname.split('/');
  if (
    companySegment !== 'company' ||
    !companyId ||
    menuSegment !== 'menu' ||
    !getDashboardMenuCompanyId(pathname) ||
    !moduleCode ||
    !menuCode ||
    !itemSlug
  ) {
    return null;
  }

  return menuPages[`./menu/${moduleCode}/${menuCode}/${itemSlug}.tsx`]?.default ?? null;
};
