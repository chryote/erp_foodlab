import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardHeader } from '../components/ui/DashboardHeader';

describe('DashboardHeader', () => {
  it('shows the fixed company module hierarchy and handles leaf selection', async () => {
    const user = userEvent.setup();
    const onSelectCompany = vi.fn();
    const onSelectModule = vi.fn();
    const onSelectSubMenu = vi.fn();
    const onSelectChildSubMenu = vi.fn();

    const DashboardHeaderHarness = () => {
      const [selectedCompanyId, setSelectedCompanyId] = useState(1);
      return (
        <DashboardHeader
          companies={[
            { id: 1, name: 'PT ABC' },
            { id: 2, name: 'PT XYZ' },
          ]}
          selectedCompanyId={selectedCompanyId}
          onSelectCompany={(company) => {
            onSelectCompany(company);
            setSelectedCompanyId(company.id);
          }}
          onSelectModule={onSelectModule}
          onSelectSubMenu={onSelectSubMenu}
          onSelectChildSubMenu={onSelectChildSubMenu}
        />
      );
    };
    render(<DashboardHeaderHarness />);

    const firstCompany = screen.getByTestId('dashboard-company-tab-1');
    const secondCompany = screen.getByTestId('dashboard-company-tab-2');
    expect(firstCompany).toHaveClass('after:bg-primary');
    expect(secondCompany).not.toHaveClass('after:bg-primary');

    await user.click(secondCompany);
    expect(onSelectCompany).not.toHaveBeenCalled();
    expect(firstCompany).toHaveClass('after:bg-primary');
    expect(secondCompany).not.toHaveClass('after:bg-primary');

    await user.keyboard('{ArrowDown}{ArrowRight}{ArrowRight}');

    expect(await screen.findByText('Master Modal')).toBeInTheDocument();
    expect(screen.getByText('View Modal')).toBeInTheDocument();
    expect(onSelectCompany).not.toHaveBeenCalled();
    expect(onSelectModule).not.toHaveBeenCalled();
    expect(onSelectSubMenu).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');

    expect(onSelectCompany).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, name: 'PT XYZ' })
    );
    expect(secondCompany).toHaveClass('after:bg-primary');
    expect(firstCompany).not.toHaveClass('after:bg-primary');
    expect(onSelectModule).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CFO' })
    );
    expect(onSelectSubMenu).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INPUT_MODAL', title: 'Input Modal' })
    );
    expect(onSelectChildSubMenu).toHaveBeenCalledWith({
      code: 'PERUSAHAAN',
      title: 'Master Modal',
    });
  });
});
