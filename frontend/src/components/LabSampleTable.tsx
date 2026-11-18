import React, { useState } from 'react';
import type { LabSample } from '../api/client';

interface LabSampleTableProps {
  samples: LabSample[];
}

export const LabSampleTable: React.FC<LabSampleTableProps> = ({ samples }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSamples =
    statusFilter === 'all'
      ? samples
      : samples.filter((sample) => sample.status === statusFilter);

  return (
    <section className="card" aria-label="Laboratory Samples">
      <div className="card-header">
        <h2>Quality Control Lab Samples</h2>
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
      </div>

      {filteredSamples.length === 0 ? (
        <p data-testid="empty-samples">No laboratory samples match the selected filter.</p>
      ) : (
        <table className="sample-table">
          <thead>
            <tr>
              <th>Batch Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>pH Level</th>
              <th>Moisture (%)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSamples.map((sample) => (
              <tr key={sample.id}>
                <td>
                  <code>{sample.batch_code}</code>
                </td>
                <td>{sample.product_name}</td>
                <td>{sample.category}</td>
                <td>{sample.ph_level.toFixed(2)}</td>
                <td>{sample.moisture_percent.toFixed(1)}%</td>
                <td>
                  <span className={`badge status-${sample.status}`}>
                    {sample.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
