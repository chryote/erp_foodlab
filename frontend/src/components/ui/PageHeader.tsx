import React, { useEffect, useMemo, useState } from 'react';
import type { Company } from '@/api/client';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  companies?: Company[];
  selectedSeries?: number;
  selectedCompanyId?: number | null;
  onSelectSeries?: (series: number) => void;
  onSelectCompany?: (company: Company) => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
  companies,
  selectedSeries: controlledSeries,
  selectedCompanyId: controlledCompanyId,
  onSelectSeries,
  onSelectCompany,
}) => {
  const resolvedCompanies = useMemo<Company[]>(() => {
    if (companies && companies.length > 0) {
      return companies.map((c) => ({
        ...c,
        series:
          typeof c.series === 'number' && Number.isFinite(c.series) && c.series >= 1
            ? Math.trunc(c.series)
            : 1,
      }));
    }
    return [{ id: 0, name: title, series: 1 }];
  }, [companies, title]);

  const seriesList = useMemo<number[]>(() => {
    const set = new Set<number>();
    for (const company of resolvedCompanies) {
      set.add(company.series ?? 1);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [resolvedCompanies]);

  const [internalSeries, setInternalSeries] = useState<number>(
    () => seriesList[0] ?? 1
  );
  const activeSeries =
    controlledSeries !== undefined && seriesList.includes(controlledSeries)
      ? controlledSeries
      : seriesList.includes(internalSeries)
        ? internalSeries
        : (seriesList[0] ?? 1);

  const companiesInActiveSeries = useMemo<Company[]>(
    () =>
      resolvedCompanies.filter((company) => (company.series ?? 1) === activeSeries),
    [resolvedCompanies, activeSeries]
  );

  const [internalCompanyId, setInternalCompanyId] = useState<number>(
    () => companiesInActiveSeries[0]?.id ?? 0
  );

  const activeCompany = useMemo<Company | undefined>(() => {
    if (controlledCompanyId === null) {
      return undefined;
    }
    const targetId =
      controlledCompanyId !== undefined ? controlledCompanyId : internalCompanyId;
    return (
      companiesInActiveSeries.find((c) => c.id === targetId) ??
      (controlledCompanyId === undefined ? companiesInActiveSeries[0] : undefined)
    );
  }, [companiesInActiveSeries, controlledCompanyId, internalCompanyId]);

  useEffect(() => {
    if (!seriesList.includes(internalSeries)) {
      setInternalSeries(seriesList[0] ?? 1);
    }
  }, [seriesList, internalSeries]);

  useEffect(() => {
    if (
      companiesInActiveSeries.length > 0 &&
      !companiesInActiveSeries.some((c) => c.id === internalCompanyId)
    ) {
      setInternalCompanyId(companiesInActiveSeries[0].id);
    }
  }, [companiesInActiveSeries, internalCompanyId]);

  const handleSeriesClick = (series: number) => {
    setInternalSeries(series);
    onSelectSeries?.(series);
    if (controlledCompanyId === undefined) {
      const firstInSeries = resolvedCompanies.find(
        (c) => (c.series ?? 1) === series
      );
      if (firstInSeries) {
        setInternalCompanyId(firstInSeries.id);
        onSelectCompany?.(firstInSeries);
      }
    }
  };

  const handleCompanyClick = (company: Company) => {
    setInternalCompanyId(company.id);
    onSelectCompany?.(company);
  };

  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="w-full flex-1">
        {eyebrow && (
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-primary">
            {eyebrow}
          </span>
        )}

        <div data-testid="header-tiered-tabs" className="flex flex-col">
          {/* Primary Tabs: Seri 1, Seri 2, Seri 3, ... */}
          <div
            role="tablist"
            aria-label="Series Tabs"
            data-testid="header-series-tabs"
            className="flex flex-wrap items-end gap-1 pl-1"
          >
            {seriesList.map((series) => {
              const isSelected = series === activeSeries;
              return (
                <button
                  key={series}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`series-tab-${series}`}
                  onClick={() => handleSeriesClick(series)}
                  className={cn(
                    'cursor-pointer rounded-t-lg border px-4 py-1.5 text-xs transition-colors',
                    isSelected
                      ? 'relative z-10 -mb-px border-border border-b-card bg-card font-bold text-primary shadow-2xs'
                      : 'border-transparent bg-slate-200/60 font-medium text-muted-foreground hover:bg-slate-200 hover:text-foreground'
                  )}
                >
                  {`Seri ${series}`}
                </button>
              );
            })}
          </div>

          {/* Secondary Tabs: All companies in the selected series */}
          <div
            role="tablist"
            aria-label="Company Tabs"
            data-testid="header-company-tabs"
            className="flex flex-wrap items-end gap-1 rounded-b-xl rounded-tr-xl border border-border bg-card px-3 pt-2.5 pb-2 shadow-sm"
          >
            {companiesInActiveSeries.map((company) => {
              const isSelected = activeCompany?.id === company.id;
              return (
                <button
                  key={company.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`company-tab-${company.id}`}
                  onClick={() => handleCompanyClick(company)}
                  className={cn(
                    'cursor-pointer rounded-md border px-4 py-1.5 text-left transition-colors',
                    isSelected
                      ? 'border-primary/40 bg-primary/15 text-base font-bold tracking-tight text-foreground shadow-2xs'
                      : 'border-border/80 bg-muted/60 text-sm font-medium text-foreground/80 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground'
                  )}
                >
                  {company.name}
                </button>
              );
            })}
          </div>
        </div>

        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
};
