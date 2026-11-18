import React, { useState } from 'react';
import type { LabSample } from '../api/client';
import { Badge, Card, CardHeader, DataTable, type DataTableColumn, type BadgeVariant } from './ui';

interface LabSampleTableProps {
  samples: LabSample[];
}

function getStatusBadgeVariant(status: LabSample['status']): BadgeVariant {
  if (status === 'approved') return 'ok';
  if (status === 'rejected') return 'err';
  return 'warn';
}

export const LabSampleTable: React.FC<LabSampleTableProps> = ({ samples }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSamples =
    statusFilter === 'all'
      ? samples
      : samples.filter((sample) => sample.status === statusFilter);

  const columns: DataTableColumn<LabSample>[] = [
    {
      key: 'batch_code',
      header: 'Batch Code',
      render: (sample) => <code>{sample.batch_code}</code>,
    },
    {
      key: 'product_name',
      header: 'Product Name',
      render: (sample) => sample.product_name,
    },
    {
      key: 'category',
      header: 'Category',
      render: (sample) => sample.category,
    },
    {
      key: 'ph_level',
      header: 'pH Level',
      render: (sample) => sample.ph_level.toFixed(2),
    },
    {
      key: 'moisture_percent',
      header: 'Moisture (%)',
      render: (sample) => `${sample.moisture_percent.toFixed(1)}%`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (sample) => (
        <Badge variant={getStatusBadgeVariant(sample.status)}>
          {sample.status}
        </Badge>
      ),
    },
  ];

  return (
    <Card aria-label="Laboratory Samples">
      <CardHeader
        title="Quality Control Lab Samples"
        actions={
          <div className="filter-group">
            <label htmlFor="status-filter">Filter Status:</label>
            <select
              id="status-filter"
              aria-label="Filter Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All ({samples.length})</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={filteredSamples}
        rowKey={(row) => row.id}
        emptyMessage="No laboratory samples match the selected filter."
        emptyTestId="empty-samples"
      />
    </Card>
  );
};
