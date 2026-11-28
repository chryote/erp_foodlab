import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeCombobox } from '../pages/menu/CHO/INPUT_PRESENSI/EmployeeCombobox';

const mocks = vi.hoisted(() => ({
  useInfiniteEmployeesQuery: vi.fn(),
  fetchNextPage: vi.fn(),
}));

vi.mock('@/lib/choResources', () => ({
  useInfiniteEmployeesQuery: mocks.useInfiniteEmployeesQuery,
}));

describe('EmployeeCombobox', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    mocks.fetchNextPage.mockReset();
    mocks.useInfiniteEmployeesQuery.mockReset();
    mocks.useInfiniteEmployeesQuery.mockReturnValue({
      data: {
        pages: [
          {
            data: [
              {
                id: 21,
                company_id: 7,
                name: 'Ayu Pratiwi',
                employee_attendance_code: 'EMP-21',
              },
            ],
          },
        ],
      },
      error: null,
      fetchNextPage: mocks.fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
    });
  });

  it('loads company employees in pages of ten and fetches more when the list scrolls', async () => {
    const onChange = vi.fn();
    render(
      <EmployeeCombobox
        id="employee"
        companyId={7}
        value=""
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Karyawan' }));
    expect(await screen.findByText('Ayu Pratiwi (EMP-21)')).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.useInfiniteEmployeesQuery).toHaveBeenLastCalledWith(
        7,
        '',
        'name,-id',
        true
      );
    });

    const list = screen.getByRole('listbox');
    Object.defineProperties(list, {
      scrollHeight: { configurable: true, value: 300 },
      clientHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, value: 100 },
    });
    fireEvent.scroll(list);
    expect(mocks.fetchNextPage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Ayu Pratiwi (EMP-21)'));
    expect(onChange).toHaveBeenCalledWith('21');
  });

  it('applies separators to options and the command input wrapper', async () => {
    render(
      <EmployeeCombobox
        id="employee"
        companyId={7}
        value=""
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Karyawan' }));
    const option = await screen.findByText('Ayu Pratiwi (EMP-21)');
    expect(option.closest('[cmdk-item]')).toHaveClass(
      'border-b',
      'border-input',
      'last:border-b-0'
    );

    const command = option.closest('[cmdk-root]');
    expect(command).toHaveClass(
      '[&_[data-slot=command-input-wrapper]]:border-b',
      '[&_[data-slot=command-input-wrapper]]:border-input'
    );
    expect(command?.querySelector('[data-slot="command-input-wrapper"]')).toBeTruthy();
  });
});
