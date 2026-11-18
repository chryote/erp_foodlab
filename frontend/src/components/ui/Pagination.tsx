import React from 'react';
import { Button } from './Button';

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
    <div className="ui-filter-bar" data-testid={testId}>
      <div className="ui-input-group">
        <label htmlFor={`${testId}-input`} className="ui-input-label">
          {searchLabel}
        </label>
        <input
          id={`${testId}-input`}
          type="search"
          className="ui-input"
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
    <div className="ui-pagination" data-testid={testId}>
      <span className="ui-pagination-info" data-testid={`${testId}-info`}>
        Halaman {currentPage} dari {safeTotalPages}
        {totalItems !== undefined ? ` (${totalItems} data)` : ''}
      </span>
      <div className="ui-pagination-actions">
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
