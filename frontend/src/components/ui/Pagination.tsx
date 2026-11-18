import React from 'react';
import { Button } from './Button';
import { ShadcnInput } from './shadcn/input';
import { ShadcnLabel } from './shadcn/label';

export interface TableFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  testId?: string;
  children?: React.ReactNode;
}

export const TableFilterBar: React.FC<TableFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchLabel = 'Filter Data',
  searchPlaceholder = 'Cari data...',
  testId = 'ui-table-filter',
  children,
}) => {
  return (
    <div
      className="flex flex-wrap items-end justify-between gap-2.5"
      data-testid={testId}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <ShadcnLabel htmlFor={`${testId}-input`}>{searchLabel}</ShadcnLabel>
        <ShadcnInput
          id={`${testId}-input`}
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {children}
      {searchValue && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSearchChange('')}
        >
          Reset Filter
        </Button>
      )}
    </div>
  );
};

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  testId?: string;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  testId = 'ui-pagination',
  onPageChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div
      className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"
      data-testid={testId}
    >
      <span
        className="text-xs text-muted-foreground"
        data-testid={`${testId}-info`}
      >
        Halaman {currentPage} dari {safeTotalPages}
        {totalItems !== undefined ? ` (${totalItems} data)` : ''}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={currentPage <= 1}
          data-testid={`${testId}-prev`}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={currentPage >= safeTotalPages}
          data-testid={`${testId}-next`}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
};
