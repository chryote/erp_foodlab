import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as apiClient from '../api/client';
import { clearActiveCompanyId, getActiveCompanyId } from '../lib/activeCompanyStorage';
import { DEFAULT_CHO_ENUMS } from '../lib/choResources';
import { DEFAULT_CDO_MODULE } from '../modules/CDO/CdoModuleCard';
import { DEFAULT_CFO_MODULE } from '../modules/CFO/CfoModuleCard';
import { DEFAULT_CHO_MODULE } from '../modules/CHO/ChoModuleCard';
import { DEFAULT_CMO_MODULE } from '../modules/CMO/CmoModuleCard';
import { DEFAULT_CPO_MODULE } from '../modules/CPO/CpoModuleCard';

vi.mock('../api/client');

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/dashboard-flow-simulator']}>
      <App />
    </MemoryRouter>
  );
}

describe('CHO (SDM) Input SDM flow: Master Karyawan, Input Karyawan, View Karyawan & Active Company', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearActiveCompanyId();
    window.localStorage.setItem('erp_foodlab.auth_token', 'test-token');
  });

  afterEach(() => {
    clearActiveCompanyId();
    window.localStorage.clear();
  });

  it('shows Input SDM -> Master Karyawan, Input Karyawan, View Karyawan, syncs active company, and performs full CRUD', async () => {
    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [
        DEFAULT_CFO_MODULE,
        DEFAULT_CHO_MODULE,
        DEFAULT_CPO_MODULE,
        DEFAULT_CDO_MODULE,
        DEFAULT_CMO_MODULE,
      ],
      meta: { count: 5 },
    });

    const companiesStore: apiClient.Company[] = [
      { id: 1, name: 'PT. Slaras Nusa Foodlab', series: 1 },
      { id: 2, name: 'PT. Pangan Nusantara', series: 1 },
    ];

    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [...companiesStore],
      meta: { count: companiesStore.length },
    });

    let activeBackendCompanyId: number | null = null;
    vi.mocked(apiClient.syncActiveCompany).mockImplementation(async (companyId) => {
      activeBackendCompanyId = companyId;
      const found =
        companiesStore.find((c) => c.id === companyId) ?? null;
      return { data: found };
    });

    vi.mocked(apiClient.fetchChoEnums).mockResolvedValue({
      data: DEFAULT_CHO_ENUMS,
    });

    let positionsStore: apiClient.EmployeePosition[] = [
      {
        id: 10,
        company_id: 1,
        code: 'POS-LAB-01',
        name: 'Analis Kimia',
        description: 'Uji kimia',
        company: companiesStore[0],
      },
    ];
    let statusesStore: apiClient.EmploymentStatus[] = [
      {
        id: 20,
        company_id: 1,
        code: 'PKWTT',
        name: 'Karyawan Tetap',
        description: 'Tetap',
        company: companiesStore[0],
      },
    ];
    let gradesStore: apiClient.PayrollGrade[] = [
      {
        id: 30,
        company_id: 1,
        grade: 1,
        sub_grade: 'A',
        level_label: 'Staff',
        base_salary: 5000000,
        position_allowance: 500000,
        total_gross: 5500000,
        bpjs_kesehatan_company: 220000,
        bpjs_kesehatan_employee: 55000,
        bpjs_ketenagakerjaan_company: 216700,
        bpjs_ketenagakerjaan_employee: 110000,
        net_employee_received: 5335000,
        total_company_cost: 5936700,
        company: companiesStore[0],
      },
    ];
    let taxStatusesStore: apiClient.TaxStatus[] = [
      {
        id: 40,
        company_id: 1,
        code: 'TK/0',
        name: 'Tidak Kawin 0',
        description: 'PTKP TK/0',
        company: companiesStore[0],
      },
    ];

    let employeesStore: apiClient.Employee[] = [
      {
        id: 101,
        company_id: 1,
        employee_position_id: 10,
        employment_status_id: 20,
        payroll_grade_id: 30,
        tax_status_id: 40,
        name: 'Nadia Putri',
        nik_ktp: '3273011504960001',
        religion: 'islam',
        blood_type: 'o',
        phone: '081234567801',
        company: companiesStore[0],
        employee_position: positionsStore[0],
        employment_status: statusesStore[0],
        payroll_grade: gradesStore[0],
        tax_status: taxStatusesStore[0],
        documents: [
          {
            id: 1,
            employee_id: 101,
            document_type: 'ktp',
            file_url: 'http://localhost:8000/storage/employees/documents/ktp/nadia.pdf',
          },
        ],
      },
      {
        id: 102,
        company_id: 2,
        name: 'Andi Wijaya',
        nik_ktp: '3171010101880003',
        religion: 'katolik',
        blood_type: 'ab',
        phone: '081500002222',
        company: companiesStore[1],
        documents: [],
      },
    ];

    vi.mocked(apiClient.fetchEmployeePositions).mockImplementation(async () => ({
      data: [...positionsStore],
      meta: { count: positionsStore.length },
    }));
    vi.mocked(apiClient.createEmployeePosition).mockImplementation(async (payload) => {
      const created: apiClient.EmployeePosition = {
        id: 11,
        ...payload,
        company: companiesStore.find((c) => c.id === payload.company_id) ?? null,
      };
      positionsStore = [created, ...positionsStore];
      return { data: created };
    });
    vi.mocked(apiClient.updateEmployeePosition).mockImplementation(async (id, payload) => {
      const updated: apiClient.EmployeePosition = {
        id,
        ...payload,
        company: companiesStore.find((c) => c.id === payload.company_id) ?? null,
      };
      positionsStore = positionsStore.map((p) => (p.id === id ? updated : p));
      return { data: updated };
    });
    vi.mocked(apiClient.deleteEmployeePosition).mockImplementation(async (id) => {
      positionsStore = positionsStore.filter((p) => p.id !== id);
      return { message: 'Employee position deleted successfully.' };
    });

    vi.mocked(apiClient.fetchEmploymentStatuses).mockImplementation(async () => ({
      data: [...statusesStore],
      meta: { count: statusesStore.length },
    }));
    vi.mocked(apiClient.createEmploymentStatus).mockImplementation(async (payload) => {
      const created: apiClient.EmploymentStatus = {
        id: 21,
        ...payload,
        company: companiesStore.find((c) => c.id === payload.company_id) ?? null,
      };
      statusesStore = [created, ...statusesStore];
      return { data: created };
    });

    vi.mocked(apiClient.fetchPayrollGrades).mockImplementation(async () => ({
      data: [...gradesStore],
      meta: { count: gradesStore.length },
    }));
    vi.mocked(apiClient.createPayrollGrade).mockImplementation(async (payload) => {
      const gross = payload.base_salary + (payload.position_allowance ?? 0);
      const created: apiClient.PayrollGrade = {
        id: 31,
        company_id: payload.company_id,
        grade: payload.grade,
        sub_grade: payload.sub_grade,
        level_label: payload.level_label,
        base_salary: payload.base_salary,
        position_allowance: payload.position_allowance ?? 0,
        total_gross: gross,
        bpjs_kesehatan_company: Math.round(gross * 0.04),
        bpjs_kesehatan_employee: Math.round(gross * 0.01),
        bpjs_ketenagakerjaan_company: Math.round(gross * 0.0394),
        bpjs_ketenagakerjaan_employee: Math.round(gross * 0.02),
        net_employee_received: gross - Math.round(gross * 0.01) - Math.round(gross * 0.02),
        total_company_cost: gross + Math.round(gross * 0.04) + Math.round(gross * 0.0394),
        company: companiesStore.find((c) => c.id === payload.company_id) ?? null,
      };
      gradesStore = [created, ...gradesStore];
      return { data: created };
    });

    vi.mocked(apiClient.fetchTaxStatuses).mockImplementation(async () => ({
      data: [...taxStatusesStore],
      meta: { count: taxStatusesStore.length },
    }));
    vi.mocked(apiClient.createTaxStatus).mockImplementation(async (payload) => {
      const created: apiClient.TaxStatus = {
        id: 41,
        ...payload,
        company: companiesStore.find((c) => c.id === payload.company_id) ?? null,
      };
      taxStatusesStore = [created, ...taxStatusesStore];
      return { data: created };
    });

    vi.mocked(apiClient.fetchEmployees).mockImplementation(async () => ({
      data: [...employeesStore],
      meta: { count: employeesStore.length },
    }));
    vi.mocked(apiClient.fetchActiveCompanyEmployees).mockImplementation(async () => {
      const filtered = employeesStore.filter(
        (e) => e.company_id === activeBackendCompanyId
      );
      return {
        data: filtered,
        meta: { count: filtered.length },
      };
    });
    vi.mocked(apiClient.uploadEmployeeDocument).mockResolvedValue({
      path: 'employees/documents/ktp/uploaded-ktp.pdf',
      disk: 'public',
      original_name: 'ktp-budi.pdf',
      mime_type: 'application/pdf',
      size: 1024,
      url: 'http://localhost:8000/storage/employees/documents/ktp/uploaded-ktp.pdf',
    });
    vi.mocked(apiClient.createEmployee).mockImplementation(async (payload) => {
      const created: apiClient.Employee = {
        id: 103,
        ...payload,
        company: companiesStore.find((c) => c.id === payload.company_id) ?? null,
        employee_position:
          positionsStore.find((p) => p.id === payload.employee_position_id) ?? null,
        employment_status:
          statusesStore.find((s) => s.id === payload.employment_status_id) ?? null,
        payroll_grade:
          gradesStore.find((g) => g.id === payload.payroll_grade_id) ?? null,
        tax_status:
          taxStatusesStore.find((t) => t.id === payload.tax_status_id) ?? null,
        documents: (payload.documents ?? []).map((doc, idx) => ({
          id: 500 + idx,
          employee_id: 103,
          document_type: doc.document_type,
          file_url: doc.file_url,
        })),
      };
      employeesStore = [created, ...employeesStore];
      return { data: created };
    });

    renderApp();

    // 1. Click secondary company tab -> updates activeCompanyStorage & calls syncActiveCompany
    fireEvent.click(await screen.findByTestId('company-tab-1'));
    expect(getActiveCompanyId()).toBe(1);
    expect(apiClient.syncActiveCompany).toHaveBeenCalledWith(1);

    // 2. Click CHO (SDM) module card -> shows Input SDM
    fireEvent.click(screen.getByTestId('module-card-CHO'));
    const inputSdmCard = await screen.findByTestId('horizontal-menu-card-INPUT_SDM');
    expect(inputSdmCard).toHaveTextContent('Input SDM');

    // 3. Click Input SDM -> shows child menu Master Karyawan, Input Karyawan, View Karyawan
    fireEvent.click(inputSdmCard);
    expect(
      screen.getByTestId('horizontal-submenu-INPUT_SDM')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('horizontal-menu-card-MASTER_KARYAWAN')
    ).toHaveTextContent('Master Karyawan');
    expect(
      screen.getByTestId('horizontal-menu-card-INPUT_KARYAWAN')
    ).toHaveTextContent('Input Karyawan');
    expect(
      screen.getByTestId('horizontal-menu-card-VIEW_KARYAWAN')
    ).toHaveTextContent('View Karyawan');

    // 4. Master Karyawan Modal: test all 4 tabs (Jabatan, Status Karyawan, Payroll Grade, Status Pajak)
    fireEvent.click(screen.getByTestId('horizontal-menu-card-MASTER_KARYAWAN'));
    const masterModal = await screen.findByTestId('master-karyawan-crud-modal');
    expect(masterModal).toBeInTheDocument();

    expect(
      await within(masterModal).findByText('Analis Kimia')
    ).toBeInTheDocument();

    // Create Position
    fireEvent.change(within(masterModal).getByLabelText('Kode Jabatan'), {
      target: { value: 'POS-QA-02' },
    });
    fireEvent.change(within(masterModal).getByLabelText('Nama Jabatan'), {
      target: { value: 'Supervisor QA' },
    });
    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createEmployeePosition).toHaveBeenCalledWith({
        company_id: 1,
        code: 'POS-QA-02',
        name: 'Supervisor QA',
        description: null,
      });
      expect(within(masterModal).getByText('Supervisor QA')).toBeInTheDocument();
    });

    // Switch to Status Karyawan tab & create
    fireEvent.click(screen.getByTestId('master-karyawan-tab-status'));
    expect(
      await within(masterModal).findByText('Karyawan Tetap')
    ).toBeInTheDocument();
    fireEvent.change(within(masterModal).getByLabelText('Kode Status'), {
      target: { value: 'PKWT' },
    });
    fireEvent.change(within(masterModal).getByLabelText('Nama Status'), {
      target: { value: 'Karyawan Kontrak' },
    });
    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.createEmploymentStatus).toHaveBeenCalledWith({
        company_id: 1,
        code: 'PKWT',
        name: 'Karyawan Kontrak',
        description: null,
      });
    });

    // Switch to Payroll Grade tab & create
    fireEvent.click(screen.getByTestId('master-karyawan-tab-grade'));
    expect(await within(masterModal).findByText('Staff')).toBeInTheDocument();
    fireEvent.change(within(masterModal).getByLabelText('Grade'), {
      target: { value: '2' },
    });
    fireEvent.change(within(masterModal).getByLabelText('Sub Grade'), {
      target: { value: 'B' },
    });
    fireEvent.change(within(masterModal).getByLabelText('Label Level'), {
      target: { value: 'Supervisor' },
    });
    fireEvent.change(within(masterModal).getByLabelText('Gaji Pokok'), {
      target: { value: '8000000' },
    });
    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.createPayrollGrade).toHaveBeenCalledWith({
        company_id: 1,
        grade: 2,
        sub_grade: 'B',
        level_label: 'Supervisor',
        base_salary: 8000000,
        position_allowance: 0,
      });
    });

    // Switch to Status Pajak tab & create
    fireEvent.click(screen.getByTestId('master-karyawan-tab-pajak'));
    expect(
      await within(masterModal).findByText('Tidak Kawin 0')
    ).toBeInTheDocument();
    fireEvent.change(within(masterModal).getByLabelText('Kode Pajak'), {
      target: { value: 'K/1' },
    });
    fireEvent.change(within(masterModal).getByLabelText('Nama Status Pajak'), {
      target: { value: 'Kawin 1' },
    });
    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.createTaxStatus).toHaveBeenCalledWith({
        company_id: 1,
        code: 'K/1',
        name: 'Kawin 1',
        description: null,
      });
    });

    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tutup Modal' }));

    // 5. Input Karyawan Modal: upload EmployeeDocument + Agama & GolonganDarah enums + create
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_KARYAWAN'));
    const inputKaryawanModal = await screen.findByTestId(
      'input-karyawan-crud-modal'
    );
    expect(
      await within(inputKaryawanModal).findByText('Nadia Putri')
    ).toBeInTheDocument();

    fireEvent.change(within(inputKaryawanModal).getByLabelText('Nama Lengkap'), {
      target: { value: 'Budi Santoso' },
    });
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Agama'), {
      target: { value: 'islam' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Golongan Darah'),
      {
        target: { value: 'ab' },
      }
    );

    // Upload EmployeeDocument via DocumentService endpoint
    const pdfFile = new File(['dummy'], 'ktp-budi.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(screen.getByTestId('employee-document-file-input'), {
      target: { files: [pdfFile] },
    });

    await waitFor(() => {
      expect(apiClient.uploadEmployeeDocument).toHaveBeenCalledWith(
        pdfFile,
        'ktp'
      );
      expect(
        screen.getByTestId('employee-documents-list')
      ).toBeInTheDocument();
    });

    fireEvent.click(
      within(inputKaryawanModal).getByRole('button', { name: 'Tambah' })
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'Budi Santoso',
          religion: 'islam',
          blood_type: 'ab',
          documents: [
            {
              document_type: 'ktp',
              file_url:
                'http://localhost:8000/storage/employees/documents/ktp/uploaded-ktp.pdf',
            },
          ],
        })
      );
      expect(
        within(inputKaryawanModal).getByText('Budi Santoso')
      ).toBeInTheDocument();
    });

    fireEvent.click(
      within(inputKaryawanModal).getByRole('button', { name: 'Tutup Modal' })
    );

    // 6. View Karyawan Modal: lists Karyawan on active clicked Company
    fireEvent.click(screen.getByTestId('horizontal-menu-card-VIEW_KARYAWAN'));
    const viewModal = await screen.findByTestId('view-karyawan-modal');
    await waitFor(() => {
      expect(apiClient.fetchActiveCompanyEmployees).toHaveBeenCalled();
      expect(within(viewModal).getByText('Nadia Putri')).toBeInTheDocument();
      expect(within(viewModal).getByText('Budi Santoso')).toBeInTheDocument();
      expect(
        within(viewModal).queryByText('Andi Wijaya')
      ).not.toBeInTheDocument();
    });
    expect(
      within(viewModal).getByTestId('view-karyawan-total-banner-value')
    ).toHaveTextContent('2 Personel');

    fireEvent.click(
      within(viewModal).getByRole('button', { name: 'Tutup Modal' })
    );

    // Switching secondary company tab updates active company & View Karyawan list
    fireEvent.click(screen.getByTestId('company-tab-2'));
    expect(getActiveCompanyId()).toBe(2);
    expect(apiClient.syncActiveCompany).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByTestId('module-card-CHO'));
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_SDM'));
    fireEvent.click(screen.getByTestId('horizontal-menu-card-VIEW_KARYAWAN'));

    const secondViewModal = await screen.findByTestId('view-karyawan-modal');
    await waitFor(() => {
      expect(
        within(secondViewModal).getByText('Andi Wijaya')
      ).toBeInTheDocument();
      expect(
        within(secondViewModal).queryByText('Nadia Putri')
      ).not.toBeInTheDocument();
    });
    expect(
      within(secondViewModal).getByTestId('view-karyawan-total-banner-value')
    ).toHaveTextContent('1 Personel');
  });
});
