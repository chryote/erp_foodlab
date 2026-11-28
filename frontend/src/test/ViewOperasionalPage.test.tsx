import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CfoViewOperasionalPage from '@/pages/menu/CFO/INPUT_OPERASIONAL/view-operasional';
import { formatCurrentMonthDateRange } from '@/modules/CFO/ViewOperasionalModal';

const resourceMocks = vi.hoisted(() => ({
  useCompanyCrudResource: vi.fn(),
  useMasterOperasionalCrudResource: vi.fn(),
}));

vi.mock('@/lib/cfoResources', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/cfoResources')>();
  return {
    ...actual,
    ...resourceMocks,
  };
});

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

describe('View Operasional date filter', () => {
  beforeEach(() => {
    const now = new Date();
    const secondDate = new Date(now);
    secondDate.setDate(now.getDate() === 1 ? 2 : now.getDate() - 1);
    const previousMonthDate = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      15
    );

    resourceMocks.useCompanyCrudResource.mockReturnValue({
      companies: [{ id: 1, name: 'FoodLab', series: 1 }],
      loading: false,
      error: null,
    });
    resourceMocks.useMasterOperasionalCrudResource.mockReturnValue({
      categories: [{ id: 10, company_id: 1, name: 'Bahan Baku' }],
      types: [
        {
          id: 20,
          company_id: 1,
          expense_category_id: 10,
          name: 'Dairy',
        },
      ],
      items: [
        {
          id: 30,
          company_id: 1,
          expense_category_id: 10,
          expense_type_id: 20,
          purchased_on: formatDate(now),
          name: 'Pengeluaran hari ini',
          amount: 1_000_000,
        },
        {
          id: 31,
          company_id: 1,
          expense_category_id: 10,
          expense_type_id: 20,
          purchased_on: formatDate(secondDate),
          name: 'Pengeluaran tanggal lain',
          amount: 2_000_000,
        },
        {
          id: 32,
          company_id: 1,
          expense_category_id: 10,
          expense_type_id: 20,
          purchased_on: formatDate(previousMonthDate),
          name: 'Pengeluaran bulan lalu',
          amount: 9_000_000,
        },
      ],
      loading: false,
      error: null,
    });
  });

  it('applies a draft date range only on submit and discards it on cancel', () => {
    const now = new Date();
    render(
      <MemoryRouter initialEntries={['/company/1']}>
        <Routes>
          <Route
            path="/company/:companyId"
            element={<CfoViewOperasionalPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    const dateRangeTrigger = screen.getByTestId('view-operasional-date-range');
    expect(dateRangeTrigger).toHaveTextContent(
      formatCurrentMonthDateRange(now)
    );
    expect(screen.getByTestId('view-operasional-month-total')).toHaveTextContent(
      '(3)'
    );

    fireEvent.click(dateRangeTrigger);
    expect(
      screen.getByTestId('view-operasional-date-range-dialog')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }));
    const previousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      10
    );
    const previousMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      20
    );
    const rangeStartButton = document.querySelector<HTMLButtonElement>(
      `[data-day="${previousMonth.toLocaleDateString()}"]`
    );
    expect(rangeStartButton).not.toBeNull();
    fireEvent.click(rangeStartButton!);
    expect(screen.getByTestId('view-operasional-month-total')).toHaveTextContent(
      '(3)'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Pilih tanggal mulai dan tanggal akhir.'
    );
    expect(dateRangeTrigger).toHaveTextContent(
      formatCurrentMonthDateRange(now)
    );

    const rangeEndButton = document.querySelector<HTMLButtonElement>(
      `[data-day="${previousMonthEnd.toLocaleDateString()}"]`
    );
    expect(rangeEndButton).not.toBeNull();
    fireEvent.click(rangeEndButton!);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    expect(dateRangeTrigger).toHaveTextContent(
      formatCurrentMonthDateRange(now)
    );
    expect(screen.getByTestId('view-operasional-month-total')).toHaveTextContent(
      '(3)'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));

    expect(dateRangeTrigger).toHaveTextContent(
      formatRange(previousMonth, previousMonthEnd)
    );
    expect(
      resourceMocks.useMasterOperasionalCrudResource.mock.calls[
        resourceMocks.useMasterOperasionalCrudResource.mock.calls.length - 1
      ]?.[2]
    ).toEqual({
      itemDateRange: {
        from: formatDate(previousMonth),
        to: formatDate(previousMonthEnd),
      },
    });
    expect(screen.getByTestId('view-operasional-month-total')).toHaveTextContent(
      '(9)'
    );

    fireEvent.click(dateRangeTrigger);
    const cancelledRangeStart = document.querySelector<HTMLButtonElement>(
      `[data-day="${new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1).toLocaleDateString()}"]`
    );
    expect(cancelledRangeStart).not.toBeNull();
    fireEvent.click(cancelledRangeStart!);
    const cancelledRangeEnd = document.querySelector<HTMLButtonElement>(
      `[data-day="${new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 5).toLocaleDateString()}"]`
    );
    expect(cancelledRangeEnd).not.toBeNull();
    fireEvent.click(cancelledRangeEnd!);
    expect(screen.getByTestId('view-operasional-month-total')).toHaveTextContent(
      '(9)'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(dateRangeTrigger).toHaveTextContent(
      formatRange(previousMonth, previousMonthEnd)
    );
    expect(screen.getByTestId('view-operasional-month-total')).toHaveTextContent(
      '(9)'
    );
  });

  it('offers current and displayed month presets without applying them immediately', () => {
    const now = new Date();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    render(
      <MemoryRouter initialEntries={['/company/1']}>
        <Routes>
          <Route
            path="/company/:companyId"
            element={<CfoViewOperasionalPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    const dateRangeTrigger = screen.getByTestId('view-operasional-date-range');
    fireEvent.click(dateRangeTrigger);
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    fireEvent.click(
      screen.getByTestId('view-operasional-preset-visible-month')
    );
    expect(dateRangeTrigger).toHaveTextContent(
      formatCurrentMonthDateRange(now)
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));

    expect(dateRangeTrigger).toHaveTextContent(
      formatRange(nextMonthStart, nextMonthEnd)
    );
    expect(screen.getByTestId('view-operasional-month-total')).toHaveTextContent(
      '(0)'
    );

    fireEvent.click(dateRangeTrigger);
    fireEvent.click(screen.getByTestId('view-operasional-preset-this-month'));
    expect(dateRangeTrigger).toHaveTextContent(
      formatRange(nextMonthStart, nextMonthEnd)
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));

    expect(dateRangeTrigger).toHaveTextContent(
      formatCurrentMonthDateRange(now)
    );
    expect(screen.getByTestId('view-operasional-month-total')).toHaveTextContent(
      '(3)'
    );
  });

  it('uses the first clicked date as the new start, even after the previous start', () => {
    const now = new Date();
    const selectedStart = new Date(now.getFullYear(), now.getMonth(), 10);
    const selectedEnd = new Date(now.getFullYear(), now.getMonth(), 15);

    render(
      <MemoryRouter initialEntries={['/company/1']}>
        <Routes>
          <Route
            path="/company/:companyId"
            element={<CfoViewOperasionalPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    const dateRangeTrigger = screen.getByTestId('view-operasional-date-range');
    fireEvent.click(dateRangeTrigger);

    const selectedStartButton = document.querySelector<HTMLButtonElement>(
      `[data-day="${selectedStart.toLocaleDateString()}"]`
    );
    expect(selectedStartButton).not.toBeNull();
    fireEvent.click(selectedStartButton!);

    const updatedStartButton = document.querySelector<HTMLButtonElement>(
      `[data-day="${selectedStart.toLocaleDateString()}"]`
    );
    expect(updatedStartButton).toHaveAttribute('data-selected-single', 'true');

    const selectedEndButton = document.querySelector<HTMLButtonElement>(
      `[data-day="${selectedEnd.toLocaleDateString()}"]`
    );
    expect(selectedEndButton).not.toBeNull();
    fireEvent.click(selectedEndButton!);
    const rangeStartAfterEnd = document.querySelector<HTMLButtonElement>(
      `[data-day="${selectedStart.toLocaleDateString()}"]`
    );
    const updatedEndButton = document.querySelector<HTMLButtonElement>(
      `[data-day="${selectedEnd.toLocaleDateString()}"]`
    );
    expect(rangeStartAfterEnd).toHaveAttribute('data-range-start', 'true');
    expect(updatedEndButton).toHaveAttribute('data-range-end', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }));

    expect(dateRangeTrigger).toHaveTextContent(
      formatRange(selectedStart, selectedEnd)
    );
  });
});
