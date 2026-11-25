import React, { useEffect, useRef } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, Search } from 'lucide-react';
import {
  ShadcnTable,
  ShadcnTableBody,
  ShadcnTableCell,
  ShadcnTableHead,
  ShadcnTableHeader,
  ShadcnTableRow,
} from './shadcn/table';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sticky?: boolean;
}

export interface DataTableSearchProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchTestId?: string;
  secondarySearchValue?: string;
  onSecondarySearchChange?: (value: string) => void;
  secondarySearchLabel?: string;
  secondarySearchPlaceholder?: string;
  secondarySearchTestId?: string;
  secondarySearchType?: 'search' | 'number';
  onSearchSubmit?: () => void;
}

export interface DataTableProps<T> extends DataTableSearchProps {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  sortKey?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  stickyHeader?: boolean;
  showSearch?: boolean;
  scrollTestId?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  loadMoreError?: string | null;
  onRetryLoadMore?: () => void;
  emptyMessage?: string;
  emptyTestId?: string;
}

export function DataTableSearch({
  searchValue,
  onSearchChange,
  searchLabel = 'Cari data',
  searchPlaceholder = 'Cari data...',
  searchTestId = 'ui-data-table-search',
  secondarySearchValue,
  onSecondarySearchChange,
  secondarySearchLabel = 'Cari data tambahan',
  secondarySearchPlaceholder = 'Cari data...',
  secondarySearchTestId = 'ui-data-table-secondary-search',
  secondarySearchType = 'search',
  onSearchSubmit,
}: DataTableSearchProps): React.ReactElement | null {
  if (
    (searchValue === undefined || !onSearchChange) &&
    (secondarySearchValue === undefined || !onSecondarySearchChange)
  ) {
    return null;
  }

  return (
    <form
      className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between"
      onSubmit={(event) => {
        event.preventDefault();
        onSearchSubmit?.();
      }}
    >
      {searchValue !== undefined && onSearchChange && (
        <label className="relative w-full">
          <span className="sr-only">{searchLabel}</span>
          <input
            type="search"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={searchLabel}
            data-testid={searchTestId}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </label>
      )}
      {secondarySearchValue !== undefined &&
        onSecondarySearchChange && (
          <label className="relative w-full">
            <span className="sr-only">{secondarySearchLabel}</span>
            <input
              type={secondarySearchType}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={secondarySearchLabel}
              data-testid={secondarySearchTestId}
              placeholder={secondarySearchPlaceholder}
              value={secondarySearchValue}
              onChange={(event) =>
                onSecondarySearchChange(event.target.value)
              }
            />
            <Search
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </label>
        )}
      <button
        type="submit"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        Cari
      </button>
    </form>
  );
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  sortKey,
  sortDirection,
  onSort,
  stickyHeader = false,
  showSearch = true,
  searchValue,
  onSearchChange,
  searchLabel = 'Cari data',
  searchPlaceholder = 'Cari data...',
  searchTestId = 'ui-data-table-search',
  secondarySearchValue,
  onSecondarySearchChange,
  secondarySearchLabel = 'Cari data tambahan',
  secondarySearchPlaceholder = 'Cari data...',
  secondarySearchTestId = 'ui-data-table-secondary-search',
  secondarySearchType = 'search',
  scrollTestId,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  loadMoreError,
  onRetryLoadMore,
  emptyMessage = 'No records found.',
  emptyTestId = 'empty-table',
}: DataTableProps<T>): React.ReactElement {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stickyHeader && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [searchValue, secondarySearchValue, sortKey, stickyHeader]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (
      !root ||
      !sentinel ||
      !hasMore ||
      !onLoadMore ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { root, rootMargin: '0px 0px 48px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (data.length === 0 && !stickyHeader) {
    return (
      <p
        className="py-8 text-center text-sm text-muted-foreground"
        data-testid={emptyTestId}
      >
        {emptyMessage}
      </p>
    );
  }

  const isSortable = (column: DataTableColumn<T>) =>
    column.sortable && onSort !== undefined;
  const isActiveSort = (column: DataTableColumn<T>) =>
    sortKey === column.key;
  const renderHeader = (column: DataTableColumn<T>) => {
    if (!isSortable(column)) return column.header;

    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 text-left"
        aria-label={`Urutkan ${column.header}`}
        onClick={() => onSort?.(column.key)}
      >
        {column.header}
        {isActiveSort(column) ? (
          sortDirection === 'desc' ? (
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          )
        ) : (
          <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    );
  };
  const getAriaSort = (
    column: DataTableColumn<T>
  ): 'none' | 'ascending' | 'descending' | undefined => {
    if (!isSortable(column)) return undefined;
    if (!isActiveSort(column)) return 'none';
    return sortDirection === 'desc' ? 'descending' : 'ascending';
  };

  if (stickyHeader) {
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
      if (
        typeof IntersectionObserver === 'undefined' &&
        hasMore &&
        onLoadMore &&
        !isLoadingMore &&
        scrollHeight - scrollTop - clientHeight <= 48
      ) {
        onLoadMore();
      }
    };

    return (
      <div className="flex min-h-0 w-full flex-1 flex-col mt-2">
        {showSearch && (
          <DataTableSearch
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchLabel={searchLabel}
            searchPlaceholder={searchPlaceholder}
            searchTestId={searchTestId}
            secondarySearchValue={secondarySearchValue}
            onSecondarySearchChange={onSecondarySearchChange}
            secondarySearchLabel={secondarySearchLabel}
            secondarySearchPlaceholder={secondarySearchPlaceholder}
            secondarySearchTestId={secondarySearchTestId}
            secondarySearchType={secondarySearchType}
          />
        )}
        <div
          className="max-h-[calc(100dvh-20rem)] min-h-0 w-full flex-1 overflow-auto lg:max-h-[32rem]"
          data-testid={scrollTestId}
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {data.length === 0 ? (
            <p
              className="py-8 text-center text-sm text-muted-foreground"
              data-testid={emptyTestId}
            >
              {emptyMessage}
            </p>
          ) : (
            <table className="w-max min-w-full table-auto caption-bottom text-sm">
              <thead>
                <tr className="border-b border-input">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`sticky top-0 z-10 h-10 bg-background px-2 text-left align-middle font-medium text-muted-foreground ${
                        column.sticky ? 'right-0 z-20' : ''
                      }`}
                      aria-sort={getAriaSort(column)}
                    >
                      {renderHeader(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr
                    key={rowKey(row)}
                    className="border-b border-input transition-colors hover:bg-muted/50"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap p-2 align-middle ${
                          column.sticky ? 'sticky right-0 z-10 bg-card' : ''
                        }`}
                      >
                        {column.render(row, index)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
            {isLoadingMore && (
              <p className="py-3 text-center text-sm text-muted-foreground" role="status">
                Memuat halaman berikutnya...
              </p>
            )}
            {loadMoreError && (
              <div className="flex flex-col items-center gap-2 py-3 text-sm text-red-600" role="alert">
                <p>{loadMoreError}</p>
                {onRetryLoadMore && (
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={onRetryLoadMore}
                  >
                    Coba lagi
                  </button>
                )}
              </div>
            )}
            <div
              ref={loadMoreSentinelRef}
              className="h-px"
              data-testid={scrollTestId ? `${scrollTestId}-sentinel` : undefined}
              aria-hidden="true"
            />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full shrink-0">
      <ShadcnTable>
        <ShadcnTableHeader>
          <ShadcnTableRow>
            {columns.map((column) => (
              <ShadcnTableHead key={column.key}>
                {renderHeader(column)}
              </ShadcnTableHead>
            ))}
          </ShadcnTableRow>
        </ShadcnTableHeader>
        <ShadcnTableBody>
          {data.map((row, index) => (
            <ShadcnTableRow key={rowKey(row)}>
              {columns.map((col) => (
                <ShadcnTableCell key={col.key}>
                  {col.render(row, index)}
                </ShadcnTableCell>
              ))}
            </ShadcnTableRow>
          ))}
        </ShadcnTableBody>
      </ShadcnTable>
    </div>
  );
}
