import React from 'react';

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
      <p className="ui-empty-state" data-testid={emptyTestId}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="ui-table-wrapper">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row, index)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
