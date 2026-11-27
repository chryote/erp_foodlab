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

    expect(await screen.findByText('View Modal')).toBeInTheDocument();
    expect(screen.queryByText('Master Modal')).not.toBeInTheDocument();
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
      code: 'DAFTAR_KAPITAL_PERUSAHAAN',
      title: 'View Modal',
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

  it('shows the admin master modal navigation only to admin users', async () => {
    const onNavigateAdminMasterModal = vi.fn();
    const { rerender } = render(
      <DashboardHeader
        companies={[]}
        user={{
          id: 1,
          name: 'Regular User',
          email: 'user@foodlab.test',
          role: 'user',
        }}
        onNavigateAdminMasterModal={onNavigateAdminMasterModal}
      />
    );
    expect(
      screen.queryByTestId('dashboard-admin-master-modal')
    ).not.toBeInTheDocument();

    rerender(
      <DashboardHeader
        companies={[]}
        user={{
          id: 1,
          name: 'Admin User',
          email: 'admin@foodlab.test',
          role: 'admin',
        }}
        onNavigateAdminMasterModal={onNavigateAdminMasterModal}
      />
    );
    await userEvent.setup().click(
      screen.getByTestId('dashboard-admin-master-modal')
    );
    expect(onNavigateAdminMasterModal).toHaveBeenCalledOnce();
  });

  it('moves the underline from the admin page to series and company tabs when a series is opened', async () => {
    const user = userEvent.setup();
    const DashboardHeaderHarness = () => {
      const [selectedSeries, setSelectedSeries] = useState(2);
      return (
        <DashboardHeader
          companies={[
            { id: 1, name: 'PT ABC', series: 1 },
            { id: 2, name: 'PT XYZ', series: 2 },
          ]}
          selectedSeries={selectedSeries}
          selectedCompanyId={2}
          user={{
            id: 1,
            name: 'Admin User',
            email: 'admin@foodlab.test',
            role: 'admin',
          }}
          isAdminMasterModalActive
          onSelectSeries={setSelectedSeries}
        />
      );
    };

    render(
      <DashboardHeaderHarness />
    );

    const selectedSeries = screen.getByTestId('dashboard-series-tab-2');
    const selectedCompany = screen.getByTestId('dashboard-company-tab-2');
    const adminPage = screen.getByTestId('dashboard-admin-master-modal');

    expect(adminPage).toHaveClass('after:absolute');
    expect(selectedSeries).not.toHaveClass('after:absolute');
    expect(selectedCompany).not.toHaveClass('after:absolute');

    await user.click(selectedSeries);

    expect(adminPage).not.toHaveClass('after:absolute');
    expect(selectedSeries).toHaveClass('after:absolute');
    expect(selectedCompany).toHaveClass('after:absolute');
    expect(adminPage).toHaveAttribute('aria-current', 'page');
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
