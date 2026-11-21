import React, { useMemo } from 'react';
import { Building2, LogOut } from 'lucide-react';
import type { AuthUser, Company } from '@/api/client';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';

export interface DashboardHeaderProps {
  companies: Company[];
  selectedSeries?: number;
  selectedCompanyId?: number | null;
  user?: AuthUser | null;
  userLoading?: boolean;
  dateRange?: string;
  onSelectSeries?: (series: number) => void;
  onSelectCompany?: (company: Company) => void;
  onLogout?: () => void | Promise<void>;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  companies,
  selectedSeries,
  selectedCompanyId,
  user,
  userLoading = false,
  dateRange,
  onSelectSeries,
  onSelectCompany,
  onLogout,
}) => {
  const seriesList = useMemo(
    () =>
      Array.from(new Set(companies.map((company) => company.series ?? 1))).sort(
        (a, b) => a - b
      ),
    [companies]
  );
  const activeSeries =
    selectedSeries !== undefined && seriesList.includes(selectedSeries)
      ? selectedSeries
      : (seriesList[0] ?? 1);
  const companiesInActiveSeries = companies.filter(
    (company) => (company.series ?? 1) === activeSeries
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background shadow-sm">
      <div className="mx-auto max-w-340 px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-14 items-center gap-4 border-b border-border">
          <div className="flex shrink-0 items-center gap-2.5">
            <span
              role="img"
              aria-label="FoodLab logo"
              className="grid h-full place-items-center rounded-lg"
            >
              <img
                src="/black-logo.png"
                alt=""
                aria-hidden="true"
                width={64}
                height={64}
                className="dashboard-header-logo dashboard-header-logo--light"
              />
              <img
                src="/white-logo.png"
                alt=""
                aria-hidden="true"
                width={64}
                height={64}
                className="dashboard-header-logo dashboard-header-logo--dark"
              />
            </span>
          </div>

          <nav
            role="tablist"
            aria-label="Company series"
            className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto self-stretch"
          >
            {seriesList.map((series) => {
              const isSelected = series === activeSeries;
              return (
                <button
                  key={series}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`dashboard-series-tab-${series}`}
                  onClick={() => onSelectSeries?.(series)}
                  className={cn(
                    'relative shrink-0 px-3 text-xs font-semibold transition-colors hover:text-primary sm:px-4',
                    isSelected
                      ? 'text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  {`Seri ${series}`}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <span
                aria-label={`Signed in as ${user.name}, ${user.email}`}
                className="hidden max-w-48 sm:block"
              >
                <span className="block truncate text-xs font-medium text-foreground">
                  Hi, <span>{user.name}</span>
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {user.email}
                </span>
              </span>
            ) : userLoading ? (
              <span
                role="status"
                className="hidden text-xs text-muted-foreground sm:block"
              >
                Memuat pengguna...
              </span>
            ) : null}
            {onLogout && (
              <Button
                variant="secondary"
                aria-label="Keluar"
                onClick={() => void onLogout()}
                className="size-9 px-0"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex min-h-12 items-center justify-between gap-3">
          <nav
            role="tablist"
            aria-label="Companies"
            className="flex min-w-0 items-center gap-1 overflow-x-auto"
          >
            {companiesInActiveSeries.map((company) => {
              const isSelected = selectedCompanyId === company.id;
              return (
                <button
                  key={company.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`dashboard-company-tab-${company.id}`}
                  onClick={() => onSelectCompany?.(company)}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    isSelected
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  {company.name}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {dateRange && (
              <span className="hidden whitespace-nowrap text-xs text-muted-foreground md:block">
                {dateRange}
              </span>
            )}
            <ThemeToggle showLabel />
          </div>
        </div>
      </div>
    </header>
  );
};
