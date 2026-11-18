import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LabSampleTable } from '../components/LabSampleTable';
import type { LabSample } from '../api/client';

describe('LabSampleTable', () => {
  const sampleItems: LabSample[] = [
    {
      id: 1,
      batch_code: 'FL-MILK-001',
      product_name: 'Pasteurized Whole Milk',
      category: 'Dairy',
      ph_level: 6.65,
      moisture_percent: 87.4,
      status: 'approved',
    },
    {
      id: 2,
      batch_code: 'FL-KIMCHI-002',
      product_name: 'Fermented Kimchi',
      category: 'Fermented',
      ph_level: 4.2,
      moisture_percent: 78.0,
      status: 'pending',
    },
  ];

  it('renders all samples by default and filters by status', () => {
    render(<LabSampleTable samples={sampleItems} />);

    expect(screen.getByText('Pasteurized Whole Milk')).toBeInTheDocument();
    expect(screen.getByText('Fermented Kimchi')).toBeInTheDocument();

    const filterSelect = screen.getByLabelText(/filter status/i);
    fireEvent.change(filterSelect, { target: { value: 'approved' } });

    expect(screen.getByText('Pasteurized Whole Milk')).toBeInTheDocument();
    expect(screen.queryByText('Fermented Kimchi')).not.toBeInTheDocument();
  });

  it('displays an empty state message when no samples match the filter', () => {
    render(<LabSampleTable samples={sampleItems} />);

    const filterSelect = screen.getByLabelText(/filter status/i);
    fireEvent.change(filterSelect, { target: { value: 'rejected' } });

    expect(screen.getByTestId('empty-samples')).toHaveTextContent(
      'No laboratory samples match the selected filter.'
    );
  });
});
