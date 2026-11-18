import * as React from 'react';
import { cn } from '@/lib/utils';

const ShadcnTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm border-collapse', className)}
      {...props}
    />
  </div>
));
ShadcnTable.displayName = 'ShadcnTable';

const ShadcnTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b border-border', className)} {...props} />
));
ShadcnTableHeader.displayName = 'ShadcnTableHeader';

const ShadcnTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
ShadcnTableBody.displayName = 'ShadcnTableBody';

const ShadcnTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border transition-colors hover:bg-muted/30',
      className
    )}
    {...props}
  />
));
ShadcnTableRow.displayName = 'ShadcnTableRow';

const ShadcnTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground',
      className
    )}
    {...props}
  />
));
ShadcnTableHead.displayName = 'ShadcnTableHead';

const ShadcnTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-3 align-middle text-sm', className)}
    {...props}
  />
));
ShadcnTableCell.displayName = 'ShadcnTableCell';

export {
  ShadcnTable,
  ShadcnTableHeader,
  ShadcnTableBody,
  ShadcnTableHead,
  ShadcnTableRow,
  ShadcnTableCell,
};
