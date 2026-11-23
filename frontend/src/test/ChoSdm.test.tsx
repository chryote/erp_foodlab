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
        code: 'POS-LAB-01',
        name: 'Analis Kimia',
        description: 'Uji kimia',
      },
    ];
    let statusesStore: apiClient.EmploymentStatus[] = [
      {
        id: 20,
        code: 'PKWTT',
        name: 'Karyawan Tetap',
        description: 'Tetap',
      },
    ];
    let gradesStore: apiClient.PayrollGrade[] = [
      {
        id: 30,
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
      },
    ];
    let taxStatusesStore: apiClient.TaxStatus[] = [
      {
        id: 40,
        code: 'TK/0',
        name: 'Tidak Kawin 0',
        description: 'PTKP TK/0',
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
        employee_attendance_code: 'NadiaAnalisKimia101',
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
        employee_attendance_code: 'Andi102',
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
        id: 10 + positionsStore.length,
        ...payload,
      };
      positionsStore = [created, ...positionsStore];
      return { data: created };
    });
    vi.mocked(apiClient.updateEmployeePosition).mockImplementation(async (id, payload) => {
      const updated: apiClient.EmployeePosition = {
        id,
        ...payload,
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
      const pos =
        positionsStore.find((p) => p.id === payload.employee_position_id) ?? null;
      const firstWord = (payload.name.trim().split(/\s+/)[0] ?? '').replace(/[^A-Za-z0-9]/g, '');
      const posClean = (pos?.name ?? '').replace(/[^A-Za-z0-9]/g, '');
      const created: apiClient.Employee = {
        id: 103,
        ...payload,
        employee_attendance_code: `${firstWord}${posClean}103`,
        company: companiesStore.find((c) => c.id === payload.company_id) ?? null,
        employee_position: pos,
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
    vi.mocked(apiClient.updateEmployee).mockImplementation(async (id, payload) => {
      const pos =
        positionsStore.find((p) => p.id === payload.employee_position_id) ?? null;
      const firstWord = (payload.name.trim().split(/\s+/)[0] ?? '').replace(/[^A-Za-z0-9]/g, '');
      const posClean = (pos?.name ?? '').replace(/[^A-Za-z0-9]/g, '');
      const updated: apiClient.Employee = {
        id,
        ...payload,
        employee_attendance_code: `${firstWord}${posClean}${id}`,
        company: companiesStore.find((c) => c.id === payload.company_id) ?? null,
        employee_position: pos,
        employment_status:
          statusesStore.find((s) => s.id === payload.employment_status_id) ?? null,
        payroll_grade:
          gradesStore.find((g) => g.id === payload.payroll_grade_id) ?? null,
        tax_status:
          taxStatusesStore.find((t) => t.id === payload.tax_status_id) ?? null,
        documents: (payload.documents ?? []).map((doc, idx) => ({
          id: 600 + idx,
          employee_id: id,
          document_type: doc.document_type,
          file_url: doc.file_url,
        })),
      };
      employeesStore = employeesStore.map((e) => (e.id === id ? updated : e));
      return { data: updated };
    });
    vi.mocked(apiClient.deleteEmployee).mockImplementation(async (id) => {
      employeesStore = employeesStore.filter((e) => e.id !== id);
      return { message: 'Employee deleted successfully.' };
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
    expect(masterModal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');

    const assertVerticalSplitLayout = (firstFieldTestId: string) => {
      const splitLayout = screen.getByTestId(
        'master-karyawan-crud-modal-split-layout'
      );
      const formPanel = screen.getByTestId(
        'master-karyawan-crud-modal-form-panel'
      );
      const tablePanel = screen.getByTestId(
        'master-karyawan-crud-modal-table-panel'
      );
      const formEl = screen.getByTestId('master-karyawan-crud-modal-form');
      expect(splitLayout).toContainElement(formPanel);
      expect(splitLayout).toContainElement(tablePanel);
      expect(formPanel).toContainElement(formEl);
      expect(formEl).toHaveClass('flex-col');
      expect(
        screen.getByTestId(firstFieldTestId)
      ).toHaveClass('sm:grid-cols-[140px_minmax(0,1fr)]');
      expect(
        within(masterModal).queryByLabelText('Pilih Perusahaan')
      ).not.toBeInTheDocument();
      expect(
        within(masterModal).queryByRole('columnheader', {
          name: 'Pilih Perusahaan',
        })
      ).not.toBeInTheDocument();
      expect(tablePanel).toContainElement(
        screen.getByTestId('master-karyawan-crud-modal-pagination')
      );
    };

    assertVerticalSplitLayout('master-karyawan-crud-modal-name-input-field');

    expect(
      await within(masterModal).findByText('Analis Kimia')
    ).toBeInTheDocument();

    // Jabatan tab only renders Nama Jabatan (no Pilih Perusahaan, Kode Jabatan, or Deskripsi)
    expect(within(masterModal).queryByLabelText('Kode Jabatan')).not.toBeInTheDocument();
    expect(within(masterModal).queryByLabelText('Deskripsi')).not.toBeInTheDocument();
    expect(
      within(masterModal).queryByRole('columnheader', { name: 'Kode Jabatan' })
    ).not.toBeInTheDocument();
    expect(
      within(masterModal).queryByRole('columnheader', { name: 'Deskripsi' })
    ).not.toBeInTheDocument();

    // Create Position with only Nama Jabatan
    fireEvent.change(within(masterModal).getByLabelText('Nama Jabatan'), {
      target: { value: 'Supervisor QA' },
    });
    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.createEmployeePosition).toHaveBeenCalledWith({
        name: 'Supervisor QA',
      });
      expect(within(masterModal).getByText('Supervisor QA')).toBeInTheDocument();
    });

    // Switch to Status Karyawan tab & create
    fireEvent.click(screen.getByTestId('master-karyawan-tab-status'));
    assertVerticalSplitLayout('master-karyawan-crud-modal-name-input-field');
    expect(
      await within(masterModal).findByText('Karyawan Tetap')
    ).toBeInTheDocument();

    // Status Karyawan tab only renders Nama Status (no Pilih Perusahaan, Kode Status, or Deskripsi)
    expect(within(masterModal).queryByLabelText('Kode Status')).not.toBeInTheDocument();
    expect(within(masterModal).queryByLabelText('Deskripsi')).not.toBeInTheDocument();
    expect(
      within(masterModal).queryByRole('columnheader', { name: 'Kode Status' })
    ).not.toBeInTheDocument();
    expect(
      within(masterModal).queryByRole('columnheader', { name: 'Deskripsi' })
    ).not.toBeInTheDocument();

    fireEvent.change(within(masterModal).getByLabelText('Nama Status'), {
      target: { value: 'Karyawan Kontrak' },
    });
    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.createEmploymentStatus).toHaveBeenCalledWith({
        name: 'Karyawan Kontrak',
      });
    });

    // Switch to Payroll Grade tab & create
    fireEvent.click(screen.getByTestId('master-karyawan-tab-grade'));
    assertVerticalSplitLayout('master-karyawan-crud-modal-grade-input-field');
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
        grade: 2,
        sub_grade: 'B',
        level_label: 'Supervisor',
        base_salary: 8000000,
        position_allowance: 0,
      });
    });

    // Switch to Status Pajak tab & create
    fireEvent.click(screen.getByTestId('master-karyawan-tab-pajak'));
    assertVerticalSplitLayout('master-karyawan-crud-modal-name-input-field');
    expect(
      await within(masterModal).findByText('Tidak Kawin 0')
    ).toBeInTheDocument();

    // Status Pajak tab only renders Nama Status Pajak (no Pilih Perusahaan, Kode Pajak, or Deskripsi)
    expect(within(masterModal).queryByLabelText('Kode Pajak')).not.toBeInTheDocument();
    expect(within(masterModal).queryByLabelText('Deskripsi')).not.toBeInTheDocument();
    expect(
      within(masterModal).queryByRole('columnheader', { name: 'Kode Pajak' })
    ).not.toBeInTheDocument();
    expect(
      within(masterModal).queryByRole('columnheader', { name: 'Deskripsi' })
    ).not.toBeInTheDocument();

    fireEvent.change(within(masterModal).getByLabelText('Nama Status Pajak'), {
      target: { value: 'Kawin 1' },
    });
    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.createTaxStatus).toHaveBeenCalledWith({
        name: 'Kawin 1',
      });
      expect(within(masterModal).getByText('Kawin 1')).toBeInTheDocument();
    });

    fireEvent.click(within(masterModal).getByRole('button', { name: 'Tutup Modal' }));

    // 5. Input Karyawan Modal: upload EmployeeDocument + Agama & GolonganDarah enums + create
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_KARYAWAN'));
    const inputKaryawanModal = await screen.findByTestId(
      'input-karyawan-crud-modal'
    );
    expect(inputKaryawanModal).toHaveClass(
      'max-w-[95vw]',
      'h-[92vh]',
      'max-h-[92vh]'
    );
    expect(
      screen.getByTestId('input-karyawan-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('input-karyawan-crud-modal-form-panel')
    );
    expect(
      screen.getByTestId('input-karyawan-crud-modal-split-layout')
    ).toContainElement(
      screen.getByTestId('input-karyawan-crud-modal-table-panel')
    );
    expect(screen.getByTestId('employee-name-input-field')).toHaveClass(
      'sm:grid-cols-[140px_minmax(0,1fr)]'
    );
    expect(
      await within(inputKaryawanModal).findByText('Nadia Putri')
    ).toBeInTheDocument();

    // Submitting empty form triggers frontend validation pop-up without calling createEmployee
    fireEvent.click(
      within(inputKaryawanModal).getByRole('button', { name: 'Tambah' })
    );
    const initialValidationDialog = await screen.findByTestId(
      'validation-error-dialog'
    );
    expect(initialValidationDialog).toHaveTextContent('Validasi Formulir Gagal');
    expect(
      within(initialValidationDialog).getByTestId('validation-error-dialog-list')
    ).toHaveTextContent('Nama Lengkap wajib diisi.');
    expect(apiClient.createEmployee).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('validation-error-dialog-close'));
    expect(
      screen.queryByTestId('validation-error-dialog')
    ).not.toBeInTheDocument();

    fireEvent.change(within(inputKaryawanModal).getByLabelText('Nama Lengkap'), {
      target: { value: 'Budi Santoso' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Nama Panggilan'),
      { target: { value: 'Budi' } }
    );
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('NIK KTP (16 Digit)'),
      { target: { value: '3201010101900001' } }
    );
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Jabatan'), {
      target: { value: '10' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Status Karyawan'),
      { target: { value: '20' } }
    );
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Payroll Grade'),
      { target: { value: '30' } }
    );
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Status Pajak'), {
      target: { value: '40' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Jenis Kelamin'),
      { target: { value: 'laki_laki' } }
    );
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Agama'), {
      target: { value: 'islam' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Golongan Darah'),
      {
        target: { value: 'ab' },
      }
    );
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Nama Ibu Kandung'),
      { target: { value: 'Siti Aminah' } }
    );
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Tempat Lahir'),
      { target: { value: 'Bandung' } }
    );
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Tanggal Lahir'),
      { target: { value: '1990-01-01' } }
    );
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Email'), {
      target: { value: 'budi.santoso@foodlab.test' },
    });
    fireEvent.change(within(inputKaryawanModal).getByLabelText('No. Telepon'), {
      target: { value: '081234567890' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('No. WhatsApp'),
      { target: { value: '081234567890' } }
    );
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('No. Telepon Darurat'),
      { target: { value: '081299998888' } }
    );
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Instagram'), {
      target: { value: '@budisantoso' },
    });
    fireEvent.change(within(inputKaryawanModal).getByLabelText('TikTok'), {
      target: { value: '@buditiktok' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('BPJS Ketenagakerjaan'),
      { target: { value: '11223344556' } }
    );
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('BPJS Kesehatan'),
      { target: { value: '0001122334455' } }
    );
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Nomor NPWP'), {
      target: { value: '123456789012345' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('URL Foto Karyawan'),
      { target: { value: 'https://cdn.foodlab.test/photos/budi.jpg' } }
    );
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Alamat KTP'), {
      target: { value: 'Jl. Merdeka No. 1, Bandung' },
    });
    fireEvent.change(
      within(inputKaryawanModal).getByLabelText('Alamat Domisili'),
      { target: { value: 'Jl. Sudirman No. 10, Jakarta' } }
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

    // Clicking Tambah Dokumen adds a second document row (next unused JenisDokumen)
    expect(
      screen.queryByTestId('employee-document-row-1')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('add-employee-document-btn'));
    const secondDocRow = await screen.findByTestId('employee-document-row-1');
    expect(secondDocRow).toBeInTheDocument();
    fireEvent.change(within(secondDocRow).getByLabelText('URL Dokumen'), {
      target: { value: 'https://cdn.foodlab.test/docs/kk-budi.pdf' },
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
            {
              document_type: 'kk',
              file_url: 'https://cdn.foodlab.test/docs/kk-budi.pdf',
            },
          ],
        })
      );
      expect(
        within(inputKaryawanModal).getByText('Budi Santoso')
      ).toBeInTheDocument();
      expect(
        within(inputKaryawanModal).getByText('BudiAnalisKimia103')
      ).toBeInTheDocument();
    });

    // Edit Employee via DataTable row button
    fireEvent.click(within(inputKaryawanModal).getByTestId('edit-row-103'));
    fireEvent.change(within(inputKaryawanModal).getByLabelText('Nama Lengkap'), {
      target: { value: 'Budi Santoso, S.Si.' },
    });
    fireEvent.click(
      within(inputKaryawanModal).getByRole('button', { name: 'Perbarui' })
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(apiClient.updateEmployee).toHaveBeenCalledWith(
        103,
        expect.objectContaining({
          name: 'Budi Santoso, S.Si.',
        })
      );
      expect(
        within(inputKaryawanModal).getByText('Budi Santoso, S.Si.')
      ).toBeInTheDocument();
    });

    // Delete Employee via DataTable row button
    fireEvent.click(within(inputKaryawanModal).getByTestId('delete-row-103'));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(apiClient.deleteEmployee).toHaveBeenCalledWith(103);
      expect(
        within(inputKaryawanModal).queryByText('Budi Santoso, S.Si.')
      ).not.toBeInTheDocument();
    });

    fireEvent.click(
      within(inputKaryawanModal).getByRole('button', { name: 'Tutup Modal' })
    );

    // 6. View Karyawan Modal: lists Karyawan on active clicked Company
    fireEvent.click(screen.getByTestId('horizontal-menu-card-VIEW_KARYAWAN'));
    const viewModal = await screen.findByTestId('view-karyawan-modal');
    expect(viewModal).toHaveClass('max-w-[95vw]', 'h-[92vh]', 'max-h-[92vh]');
    expect(
      screen.getByTestId('view-karyawan-modal-table-panel')
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(apiClient.fetchActiveCompanyEmployees).toHaveBeenCalled();
      expect(within(viewModal).getByText('Nadia Putri')).toBeInTheDocument();
      expect(
        within(viewModal).getByText('NadiaAnalisKimia101')
      ).toBeInTheDocument();
      expect(
        within(viewModal).queryByText('Andi Wijaya')
      ).not.toBeInTheDocument();
    });
    expect(
      within(viewModal).getByTestId('view-karyawan-total-banner-value')
    ).toHaveTextContent('1 Personel');

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

  it('displays validation pop-up on Input Karyawan frontend validation failure (all fields + min 1 document) and backend 422 validation failure', async () => {
    const company: apiClient.Company = {
      id: 1,
      name: 'PT. Slaras Nusa Foodlab',
      series: 1,
    };

    vi.mocked(apiClient.fetchErpModules).mockResolvedValue({
      data: [DEFAULT_CHO_MODULE],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchCompanies).mockResolvedValue({
      data: [company],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.syncActiveCompany).mockResolvedValue({ data: company });
    vi.mocked(apiClient.fetchChoEnums).mockResolvedValue({
      data: DEFAULT_CHO_ENUMS,
    });
    vi.mocked(apiClient.fetchEmployeePositions).mockResolvedValue({
      data: [{ id: 10, code: 'POS-01', name: 'Analis' }],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchEmploymentStatuses).mockResolvedValue({
      data: [{ id: 20, code: 'PKWTT', name: 'Tetap' }],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchPayrollGrades).mockResolvedValue({
      data: [
        {
          id: 30,
          grade: 1,
          sub_grade: 'A',
          level_label: 'Staff',
          base_salary: 5000000,
          position_allowance: 0,
          total_gross: 5000000,
          bpjs_kesehatan_company: 200000,
          bpjs_kesehatan_employee: 50000,
          bpjs_ketenagakerjaan_company: 197000,
          bpjs_ketenagakerjaan_employee: 100000,
          net_employee_received: 4850000,
          total_company_cost: 5397000,
        },
      ],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchTaxStatuses).mockResolvedValue({
      data: [{ id: 40, code: 'TK/0', name: 'TK/0' }],
      meta: { count: 1 },
    });
    vi.mocked(apiClient.fetchEmployees).mockResolvedValue({
      data: [],
      meta: { count: 0 },
    });

    const backendValidationErr = Object.assign(
      new Error('Failed to create employee: 422 - NIK KTP sudah terdaftar.'),
      {
        status: 422,
        errors: {
          nik_ktp: ['NIK KTP sudah terdaftar.'],
          documents: ['Dokumen karyawan minimal harus melampirkan 1 dokumen.'],
        },
      }
    );
    vi.mocked(apiClient.createEmployee).mockRejectedValue(backendValidationErr);

    renderApp();

    fireEvent.click(await screen.findByTestId('company-tab-1'));
    fireEvent.click(screen.getByTestId('module-card-CHO'));
    fireEvent.click(
      await screen.findByTestId('horizontal-menu-card-INPUT_SDM')
    );
    fireEvent.click(screen.getByTestId('horizontal-menu-card-INPUT_KARYAWAN'));

    const modal = await screen.findByTestId('input-karyawan-crud-modal');

    // Remove the single document row -> must trigger min-1-document error in pop-up
    fireEvent.click(
      within(modal).getByTestId('remove-employee-document-row-0')
    );
    fireEvent.change(within(modal).getByLabelText('NIK KTP (16 Digit)'), {
      target: { value: '12345' },
    });
    fireEvent.change(within(modal).getByLabelText('Email'), {
      target: { value: 'invalid-email' },
    });

    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));

    const frontendPopup = await screen.findByTestId('validation-error-dialog');
    expect(frontendPopup).toHaveTextContent('Validasi Formulir Gagal');
    const frontendList = within(frontendPopup).getByTestId(
      'validation-error-dialog-list'
    );
    expect(frontendList).toHaveTextContent(
      'Dokumen Karyawan minimal harus melampirkan 1 dokumen.'
    );
    expect(frontendList).toHaveTextContent(
      'NIK KTP harus terdiri dari 16 digit angka.'
    );
    expect(frontendList).toHaveTextContent('Format Email tidak valid.');
    expect(frontendList).toHaveTextContent('Nama Lengkap wajib diisi.');
    expect(frontendList).toHaveTextContent('Alamat Domisili wajib diisi.');
    expect(apiClient.createEmployee).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('validation-error-dialog-close'));

    // Fill all fields + 1 document so frontend validation passes and backend 422 triggers pop-up
    fireEvent.click(within(modal).getByTestId('add-employee-document-btn'));
    const docRow = await within(modal).findByTestId('employee-document-row-0');
    fireEvent.change(within(docRow).getByLabelText('URL Dokumen'), {
      target: { value: 'https://cdn.foodlab.test/docs/ktp.pdf' },
    });

    fireEvent.change(within(modal).getByLabelText('Nama Lengkap'), {
      target: { value: 'Rina Kusuma' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Panggilan'), {
      target: { value: 'Rina' },
    });
    fireEvent.change(within(modal).getByLabelText('NIK KTP (16 Digit)'), {
      target: { value: '3201010101900099' },
    });
    fireEvent.change(within(modal).getByLabelText('Jabatan'), {
      target: { value: '10' },
    });
    fireEvent.change(within(modal).getByLabelText('Status Karyawan'), {
      target: { value: '20' },
    });
    fireEvent.change(within(modal).getByLabelText('Payroll Grade'), {
      target: { value: '30' },
    });
    fireEvent.change(within(modal).getByLabelText('Status Pajak'), {
      target: { value: '40' },
    });
    fireEvent.change(within(modal).getByLabelText('Jenis Kelamin'), {
      target: { value: 'perempuan' },
    });
    fireEvent.change(within(modal).getByLabelText('Agama'), {
      target: { value: 'islam' },
    });
    fireEvent.change(within(modal).getByLabelText('Golongan Darah'), {
      target: { value: 'a' },
    });
    fireEvent.change(within(modal).getByLabelText('Nama Ibu Kandung'), {
      target: { value: 'Dewi' },
    });
    fireEvent.change(within(modal).getByLabelText('Tempat Lahir'), {
      target: { value: 'Jakarta' },
    });
    fireEvent.change(within(modal).getByLabelText('Tanggal Lahir'), {
      target: { value: '1994-03-10' },
    });
    fireEvent.change(within(modal).getByLabelText('Email'), {
      target: { value: 'rina@foodlab.test' },
    });
    fireEvent.change(within(modal).getByLabelText('No. Telepon'), {
      target: { value: '081234567890' },
    });
    fireEvent.change(within(modal).getByLabelText('No. WhatsApp'), {
      target: { value: '081234567890' },
    });
    fireEvent.change(within(modal).getByLabelText('No. Telepon Darurat'), {
      target: { value: '081234567891' },
    });
    fireEvent.change(within(modal).getByLabelText('Instagram'), {
      target: { value: '@rina' },
    });
    fireEvent.change(within(modal).getByLabelText('TikTok'), {
      target: { value: '@rinatiktok' },
    });
    fireEvent.change(within(modal).getByLabelText('BPJS Ketenagakerjaan'), {
      target: { value: '1122334455' },
    });
    fireEvent.change(within(modal).getByLabelText('BPJS Kesehatan'), {
      target: { value: '00011223344' },
    });
    fireEvent.change(within(modal).getByLabelText('Nomor NPWP'), {
      target: { value: '123456789012345' },
    });
    fireEvent.change(within(modal).getByLabelText('URL Foto Karyawan'), {
      target: { value: 'https://cdn.foodlab.test/photos/rina.jpg' },
    });
    fireEvent.change(within(modal).getByLabelText('Alamat KTP'), {
      target: { value: 'Jl. Melati No. 1' },
    });
    fireEvent.change(within(modal).getByLabelText('Alamat Domisili'), {
      target: { value: 'Jl. Mawar No. 2' },
    });

    fireEvent.click(within(modal).getByRole('button', { name: 'Tambah' }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    const backendPopup = await screen.findByTestId('validation-error-dialog');
    expect(backendPopup).toHaveTextContent('Validasi Backend Gagal');
    expect(
      within(backendPopup).getByTestId('validation-error-dialog-list')
    ).toHaveTextContent('NIK KTP sudah terdaftar.');
    expect(within(modal).getByLabelText('Nama Lengkap')).toHaveValue(
      'Rina Kusuma'
    );
  });
});
