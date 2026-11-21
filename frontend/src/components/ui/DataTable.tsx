import React from 'react';
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
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
  emptyTestId?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No records found.',
  emptyTestId = 'empty-table',
}: DataTableProps<T>): React.ReactElement {
  if (data.length === 0) {
    return (
      <p
        className="py-8 text-center text-sm text-muted-foreground"
        data-testid={emptyTestId}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="w-full shrink-0">
      <ShadcnTable>
        <ShadcnTableHeader>
          <ShadcnTableRow>
            {columns.map((col) => (
              <ShadcnTableHead key={col.key}>{col.header}</ShadcnTableHead>
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
