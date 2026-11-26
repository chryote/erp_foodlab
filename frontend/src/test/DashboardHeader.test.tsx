import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardHeader } from '../components/ui/DashboardHeader';

describe('DashboardHeader', () => {
  it('opens company menus on click, not while scrolling the menubar', async () => {
    const user = userEvent.setup();
    render(
      <DashboardHeader
        companies={[
          { id: 1, name: 'PT ABC' },
          { id: 2, name: 'PT XYZ' },
        ]}
        selectedCompanyId={1}
      />
    );

    const firstCompany = screen.getByTestId('dashboard-company-tab-1');
    fireEvent.pointerDown(firstCompany, { pointerType: 'touch' });
    fireEvent.pointerMove(firstCompany, { pointerType: 'touch' });

    expect(screen.queryByText('CFO')).not.toBeInTheDocument();

    await user.click(firstCompany);
    expect(await screen.findByText('CFO')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('CFO')).not.toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    expect(await screen.findByText('CFO')).toBeInTheDocument();
  });

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

  it('shows CHO-specific employee and attendance menu children', async () => {
    const user = userEvent.setup();
    render(
      <DashboardHeader
        companies={[{ id: 1, name: 'PT ABC' }]}
        selectedCompanyId={1}
      />
    );

    await user.click(screen.getByTestId('dashboard-company-tab-1'));
    await user.hover(screen.getByText('CHO'));

    expect(await screen.findByText('Input SDM')).toBeInTheDocument();
    expect(screen.getByText('Input Presensi')).toBeInTheDocument();
    expect(screen.queryByText('Input Modal')).not.toBeInTheDocument();
  });

  it('selects a module menu item directly when it has no child menu', async () => {
    const user = userEvent.setup();
    const onSelectCompany = vi.fn();
    const onSelectModule = vi.fn();
    const onSelectSubMenu = vi.fn();
    const onSelectChildSubMenu = vi.fn();
    render(
      <DashboardHeader
        companies={[{ id: 1, name: 'PT ABC' }]}
        selectedCompanyId={1}
        onSelectCompany={onSelectCompany}
        onSelectModule={onSelectModule}
        onSelectSubMenu={onSelectSubMenu}
        onSelectChildSubMenu={onSelectChildSubMenu}
      />
    );

    await user.click(screen.getByTestId('dashboard-company-tab-1'));
    await user.keyboard(
      '{ArrowDown}{ArrowRight}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}'
    );

    expect(onSelectCompany).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'PT ABC' })
    );
    expect(onSelectModule).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CFO' })
    );
    expect(onSelectSubMenu).toHaveBeenCalledWith({
      code: 'ARUS_KAS',
      title: 'Arus Kas',
    });
    expect(onSelectChildSubMenu).not.toHaveBeenCalled();
  });
});
