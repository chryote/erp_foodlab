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

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  sortKey?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  stickyHeader?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchTestId?: string;
  scrollTestId?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
  emptyTestId?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  sortKey,
  sortDirection,
  onSort,
  stickyHeader = false,
  searchValue,
  onSearchChange,
  searchLabel = 'Cari data',
  searchPlaceholder = 'Cari data...',
  searchTestId = 'ui-data-table-search',
  scrollTestId,
  hasMore = false,
  onLoadMore,
  emptyMessage = 'No records found.',
  emptyTestId = 'empty-table',
}: DataTableProps<T>): React.ReactElement {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stickyHeader && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [searchValue, sortKey, stickyHeader]);

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
        hasMore &&
        onLoadMore &&
        scrollHeight - scrollTop - clientHeight <= 48
      ) {
        onLoadMore();
      }
    };

    return (
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {searchValue !== undefined && onSearchChange && (
          <div className="flex shrink-0 justify-end py-2">
            <label className="relative w-full max-w-xs">
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
          </div>
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
