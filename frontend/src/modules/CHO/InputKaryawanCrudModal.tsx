import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  Employee,
  EmployeeDocumentInput,
  EmployeePayload,
} from '@/api/client';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  Modal,
  Pagination,
  SelectInput,
  TextareaInput,
  TextInput,
} from '@/components/ui';
import { useEmployeeCrudResource } from '@/lib/choResources';

interface EmployeeFormState {
  company_id: string;
  employee_position_id: string;
  employment_status_id: string;
  payroll_grade_id: string;
  tax_status_id: string;
  name: string;
  nickname: string;
  nik_ktp: string;
  birth_place: string;
  birth_date: string;
  gender: string;
  religion: string;
  blood_type: string;
  mother_name: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  emergency_phone_number: string;
  instagram: string;
  tiktok: string;
  ktp_address: string;
  domicile_address: string;
  bpjs_ketenagakerjaan: string;
  bpjs_kesehatan: string;
  npwp_number: string;
  photo_url: string;
}

type PendingEmployeeAction =
  | { type: 'create'; payload: EmployeePayload }
  | { type: 'update'; id: number; payload: EmployeePayload }
  | { type: 'delete'; id: number };

function createEmptyEmployeeForm(defaultCompanyId: string): EmployeeFormState {
  return {
    company_id: defaultCompanyId,
    employee_position_id: '',
    employment_status_id: '',
    payroll_grade_id: '',
    tax_status_id: '',
    name: '',
    nickname: '',
    nik_ktp: '',
    birth_place: '',
    birth_date: '',
    gender: '',
    religion: '',
    blood_type: '',
    mother_name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    emergency_phone_number: '',
    instagram: '',
    tiktok: '',
    ktp_address: '',
    domicile_address: '',
    bpjs_ketenagakerjaan: '',
    bpjs_kesehatan: '',
    npwp_number: '',
    photo_url: '',
  };
}

function employeeToFormState(employee: Employee): EmployeeFormState {
  return {
    company_id: String(employee.company_id),
    employee_position_id:
      employee.employee_position_id !== null &&
      employee.employee_position_id !== undefined
        ? String(employee.employee_position_id)
        : '',
    employment_status_id:
      employee.employment_status_id !== null &&
      employee.employment_status_id !== undefined
        ? String(employee.employment_status_id)
        : '',
    payroll_grade_id:
      employee.payroll_grade_id !== null &&
      employee.payroll_grade_id !== undefined
        ? String(employee.payroll_grade_id)
        : '',
    tax_status_id:
      employee.tax_status_id !== null && employee.tax_status_id !== undefined
        ? String(employee.tax_status_id)
        : '',
    name: employee.name ?? '',
    nickname: employee.nickname ?? '',
    nik_ktp: employee.nik_ktp ?? '',
    birth_place: employee.birth_place ?? '',
    birth_date: employee.birth_date ? employee.birth_date.slice(0, 10) : '',
    gender: employee.gender ?? '',
    religion: employee.religion ?? '',
    blood_type: employee.blood_type ?? '',
    mother_name: employee.mother_name ?? '',
    email: employee.email ?? '',
    phone: employee.phone ?? '',
    whatsapp_number: employee.whatsapp_number ?? '',
    emergency_phone_number: employee.emergency_phone_number ?? '',
    instagram: employee.instagram ?? '',
    tiktok: employee.tiktok ?? '',
    ktp_address: employee.ktp_address ?? '',
    domicile_address: employee.domicile_address ?? '',
    bpjs_ketenagakerjaan: employee.bpjs_ketenagakerjaan ?? '',
    bpjs_kesehatan: employee.bpjs_kesehatan ?? '',
    npwp_number: employee.npwp_number ?? '',
    photo_url: employee.photo_url ?? '',
  };
}

function nullableTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableInt(value: string): number | null {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export interface InputKaryawanCrudModalProps {
  isOpen: boolean;
  company: Company | null;
  companies?: Company[];
  onClose: () => void;
}

export const InputKaryawanCrudModal: React.FC<InputKaryawanCrudModalProps> = ({
  isOpen,
  company,
  companies,
  onClose,
}) => {
  const {
    allEmployees,
    allPositions,
    allStatuses,
    allGrades,
    allTaxStatuses,
    enums,
    loading,
    uploadingDocument,
    error,
    clearError,
    createEmployee,
    updateEmployee,
    removeEmployee,
    uploadDocument,
  } = useEmployeeCrudResource(isOpen, company);

  const availableCompanies = useMemo<Company[]>(() => {
    if (companies && companies.length > 0) {
      return companies;
    }
    return company ? [company] : [];
  }, [companies, company]);

  const defaultCompanyId = company ? String(company.id) : '';

  const [form, setForm] = useState<EmployeeFormState>(() =>
    createEmptyEmployeeForm(defaultCompanyId)
  );
  const [documents, setDocuments] = useState<EmployeeDocumentInput[]>([]);
  const [docTypeInput, setDocTypeInput] = useState<string>('ktp');
  const [docUrlInput, setDocUrlInput] = useState<string>('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingAction, setPendingAction] =
    useState<PendingEmployeeAction | null>(null);

  const pageSize = 5;

  useEffect(() => {
    if (isOpen) {
      setForm(createEmptyEmployeeForm(defaultCompanyId));
      setDocuments([]);
      setDocTypeInput(enums.jenis_dokumen[0]?.value ?? 'ktp');
      setDocUrlInput('');
      setEditingEmployee(null);
      setCurrentPage(1);
      setPendingAction(null);
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultCompanyId]);

  const selectedCompanyId = parseInt(form.company_id, 10);

  const companyOptions = useMemo(
    () =>
      availableCompanies.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [availableCompanies]
  );

  const positionOptions = useMemo(
    () =>
      allPositions
        .filter(
          (p) =>
            !Number.isFinite(selectedCompanyId) ||
            Number(p.company_id) === selectedCompanyId
        )
        .map((p) => ({ value: String(p.id), label: `${p.code} - ${p.name}` })),
    [allPositions, selectedCompanyId]
  );

  const statusOptions = useMemo(
    () =>
      allStatuses
        .filter(
          (s) =>
            !Number.isFinite(selectedCompanyId) ||
            Number(s.company_id) === selectedCompanyId
        )
        .map((s) => ({ value: String(s.id), label: `${s.code} - ${s.name}` })),
    [allStatuses, selectedCompanyId]
  );

  const gradeOptions = useMemo(
    () =>
      allGrades
        .filter(
          (g) =>
            !Number.isFinite(selectedCompanyId) ||
            Number(g.company_id) === selectedCompanyId
        )
        .map((g) => ({
          value: String(g.id),
          label: `Grade ${g.grade}${g.sub_grade}${g.level_label ? ` (${g.level_label})` : ''}`,
        })),
    [allGrades, selectedCompanyId]
  );

  const taxStatusOptions = useMemo(
    () =>
      allTaxStatuses
        .filter(
          (t) =>
            !Number.isFinite(selectedCompanyId) ||
            Number(t.company_id) === selectedCompanyId
        )
        .map((t) => ({ value: String(t.id), label: `${t.code} - ${t.name}` })),
    [allTaxStatuses, selectedCompanyId]
  );

  const religionLabelByValue = useMemo(
    () => new Map(enums.agama.map((item) => [item.value, item.nama])),
    [enums.agama]
  );
  const bloodTypeLabelByValue = useMemo(
    () => new Map(enums.golongan_darah.map((item) => [item.value, item.nama])),
    [enums.golongan_darah]
  );
  const documentLabelByValue = useMemo(
    () => new Map(enums.jenis_dokumen.map((item) => [item.value, item.nama])),
    [enums.jenis_dokumen]
  );

  const selectedDocTypeMeta = useMemo(
    () => enums.jenis_dokumen.find((item) => item.value === docTypeInput),
    [enums.jenis_dokumen, docTypeInput]
  );

  const totalPages = Math.max(1, Math.ceil(allEmployees.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEmployees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return allEmployees.slice(start, start + pageSize);
  }, [allEmployees, safeCurrentPage]);

  const handleFieldChange = (key: keyof EmployeeFormState, value: string) => {
    setForm((prev) => {
      if (key === 'company_id' && prev.company_id !== value) {
        return {
          ...prev,
          company_id: value,
          employee_position_id: '',
          employment_status_id: '',
          payroll_grade_id: '',
          tax_status_id: '',
        };
      }
      return { ...prev, [key]: value };
    });
  };

  const handlePhotoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      return;
    }
    const uploaded = await uploadDocument(file, 'pas_foto');
    if (uploaded?.url) {
      setForm((prev) => ({ ...prev, photo_url: uploaded.url }));
    }
  };

  const handleDocumentFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !docTypeInput) {
      return;
    }
    const uploaded = await uploadDocument(file, docTypeInput);
    if (uploaded?.url) {
      upsertDocument(docTypeInput, uploaded.url);
    }
  };

  const upsertDocument = (documentType: string, fileUrl: string) => {
    const cleanUrl = fileUrl.trim();
    if (!documentType || !cleanUrl) {
      return;
    }
    setDocuments((prev) => {
      const exists = prev.some((d) => d.document_type === documentType);
      if (exists) {
        return prev.map((d) =>
          d.document_type === documentType ? { ...d, file_url: cleanUrl } : d
        );
      }
      return [...prev, { document_type: documentType, file_url: cleanUrl }];
    });
  };

  const handleAddDocumentUrl = () => {
    if (!docTypeInput || !docUrlInput.trim()) {
      return;
    }
    upsertDocument(docTypeInput, docUrlInput);
    setDocUrlInput('');
  };

  const handleRemoveDocument = (documentType: string) => {
    setDocuments((prev) => prev.filter((d) => d.document_type !== documentType));
  };

  const buildPayload = (): EmployeePayload | null => {
    const companyId = parseInt(form.company_id, 10);
    const name = form.name.trim();
    if (!Number.isFinite(companyId) || !name) {
      return null;
    }

    return {
      company_id: companyId,
      employee_position_id: nullableInt(form.employee_position_id),
      employment_status_id: nullableInt(form.employment_status_id),
      payroll_grade_id: nullableInt(form.payroll_grade_id),
      tax_status_id: nullableInt(form.tax_status_id),
      name,
      nickname: nullableTrimmed(form.nickname),
      nik_ktp: nullableTrimmed(form.nik_ktp),
      birth_place: nullableTrimmed(form.birth_place),
      birth_date: nullableTrimmed(form.birth_date),
      gender: nullableTrimmed(form.gender),
      religion: nullableTrimmed(form.religion),
      blood_type: nullableTrimmed(form.blood_type),
      mother_name: nullableTrimmed(form.mother_name),
      email: nullableTrimmed(form.email),
      phone: nullableTrimmed(form.phone),
      whatsapp_number: nullableTrimmed(form.whatsapp_number),
      emergency_phone_number: nullableTrimmed(form.emergency_phone_number),
      instagram: nullableTrimmed(form.instagram),
      tiktok: nullableTrimmed(form.tiktok),
      ktp_address: nullableTrimmed(form.ktp_address),
      domicile_address: nullableTrimmed(form.domicile_address),
      bpjs_ketenagakerjaan: nullableTrimmed(form.bpjs_ketenagakerjaan),
      bpjs_kesehatan: nullableTrimmed(form.bpjs_kesehatan),
      npwp_number: nullableTrimmed(form.npwp_number),
      photo_url: nullableTrimmed(form.photo_url),
      documents,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) {
      return;
    }
    if (editingEmployee) {
      setPendingAction({
        type: 'update',
        id: editingEmployee.id,
        payload,
      });
    } else {
      setPendingAction({ type: 'create', payload });
    }
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction) {
      return;
    }
    const action = pendingAction;
    setPendingAction(null);

    if (action.type === 'create') {
      const created = await createEmployee(action.payload);
      if (created) {
        setForm(createEmptyEmployeeForm(defaultCompanyId));
        setDocuments([]);
        setCurrentPage(1);
      }
    } else if (action.type === 'update') {
      const updated = await updateEmployee(action.id, action.payload);
      if (updated) {
        setEditingEmployee(null);
        setForm(createEmptyEmployeeForm(defaultCompanyId));
        setDocuments([]);
      }
    } else if (action.type === 'delete') {
      const removed = await removeEmployee(action.id);
      if (removed && editingEmployee?.id === action.id) {
        setEditingEmployee(null);
        setForm(createEmptyEmployeeForm(defaultCompanyId));
        setDocuments([]);
      }
    }
  };

  const handleStartEdit = (employee: Employee) => {
    clearError();
    setEditingEmployee(employee);
    setForm(employeeToFormState(employee));
    setDocuments(
      (employee.documents ?? []).map((doc) => ({
        document_type: doc.document_type,
        file_url: doc.file_url,
      }))
    );
  };

  const handleCancelEdit = () => {
    clearError();
    setEditingEmployee(null);
    setForm(createEmptyEmployeeForm(defaultCompanyId));
    setDocuments([]);
  };

  const columns: DataTableColumn<Employee>[] = [
    {
      key: 'no',
      header: 'No',
      render: (_row, index) => (
        <code>{(safeCurrentPage - 1) * pageSize + index + 1}</code>
      ),
    },
    {
      key: 'name',
      header: 'Nama Karyawan',
      render: (row) => (
        <div>
          <span className="block font-medium text-foreground">{row.name}</span>
          {row.nik_ktp && (
            <span className="block text-xs text-muted-foreground">
              NIK: {row.nik_ktp}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Perusahaan',
      render: (row) =>
        availableCompanies.find((c) => c.id === Number(row.company_id))?.name ??
        row.company?.name ??
        String(row.company_id),
    },
    {
      key: 'position',
      header: 'Jabatan / Status',
      render: (row) => {
        const pos =
          allPositions.find((p) => p.id === Number(row.employee_position_id))
            ?.name ?? row.employee_position?.name;
        const st =
          allStatuses.find((s) => s.id === Number(row.employment_status_id))
            ?.name ?? row.employment_status?.name;
        return (
          <div className="text-xs">
            <span className="block font-medium text-foreground">
              {pos ?? '-'}
            </span>
            <span className="block text-muted-foreground">{st ?? '-'}</span>
          </div>
        );
      },
    },
    {
      key: 'religion_blood',
      header: 'Agama / Gol. Darah',
      render: (row) => (
        <div className="text-xs">
          <span className="block">
            {row.religion
              ? (religionLabelByValue.get(row.religion) ?? row.religion)
              : '-'}
          </span>
          <span className="block text-muted-foreground">
            {row.blood_type
              ? `Gol. ${bloodTypeLabelByValue.get(row.blood_type) ?? row.blood_type}`
              : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'documents',
      header: 'Dokumen',
      render: (row) => (
        <Badge variant={(row.documents?.length ?? 0) > 0 ? 'ok' : 'neutral'}>
          {row.documents?.length ?? 0} berkas
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div
          className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap"
          data-testid={`actions-row-${row.id}`}
        >
          <Button
            variant="secondary"
            className="h-7 px-2.5 py-1 text-xs"
            data-testid={`edit-row-${row.id}`}
            onClick={() => handleStartEdit(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="h-7 px-2.5 py-1 text-xs"
            data-testid={`delete-row-${row.id}`}
            onClick={() => setPendingAction({ type: 'delete', id: row.id })}
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  const confirmDialogConfig = useMemo(() => {
    if (!pendingAction) {
      return { title: '', message: '' };
    }
    if (pendingAction.type === 'create') {
      return {
        title: 'Konfirmasi Tambah Karyawan',
        message: 'Apakah Anda yakin ingin menambahkan data karyawan ini?',
      };
    }
    if (pendingAction.type === 'update') {
      return {
        title: 'Konfirmasi Perbarui Karyawan',
        message: 'Apakah Anda yakin ingin memperbarui data karyawan ini?',
      };
    }
    return {
      title: 'Konfirmasi Hapus Karyawan',
      message: 'Apakah Anda yakin ingin menghapus data karyawan ini?',
    };
  }, [pendingAction]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="Input Karyawan"
        subtitle="Kelola data karyawan, enum agama & golongan darah, serta unggah dokumen via DocumentService"
        testId="input-karyawan-crud-modal"
        maxWidthClass="max-w-6xl"
        onClose={onClose}
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          data-testid="input-karyawan-crud-modal-form"
          className="flex flex-col gap-4 border-b border-border pb-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <SelectInput
              id="employee-company-input"
              label="Pilih Perusahaan"
              placeholder="Pilih perusahaan..."
              options={companyOptions}
              value={form.company_id}
              onChange={(e) => handleFieldChange('company_id', e.target.value)}
            />
            <TextInput
              id="employee-name-input"
              label="Nama Lengkap"
              placeholder="Contoh: Nadia Putri Pratiwi"
              required
              value={form.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
            />
            <TextInput
              id="employee-nickname-input"
              label="Nama Panggilan"
              placeholder="Contoh: Nadia"
              value={form.nickname}
              onChange={(e) => handleFieldChange('nickname', e.target.value)}
            />
            <TextInput
              id="employee-nik-ktp-input"
              label="NIK KTP (16 Digit)"
              placeholder="Contoh: 3273011504960001"
              maxLength={16}
              value={form.nik_ktp}
              onChange={(e) => handleFieldChange('nik_ktp', e.target.value)}
            />

            <SelectInput
              id="employee-position-input"
              label="Jabatan"
              placeholder="Pilih jabatan..."
              options={positionOptions}
              disabled={!form.company_id}
              value={form.employee_position_id}
              onChange={(e) =>
                handleFieldChange('employee_position_id', e.target.value)
              }
            />
            <SelectInput
              id="employee-status-input"
              label="Status Karyawan"
              placeholder="Pilih status..."
              options={statusOptions}
              disabled={!form.company_id}
              value={form.employment_status_id}
              onChange={(e) =>
                handleFieldChange('employment_status_id', e.target.value)
              }
            />
            <SelectInput
              id="employee-grade-input"
              label="Payroll Grade"
              placeholder="Pilih payroll grade..."
              options={gradeOptions}
              disabled={!form.company_id}
              value={form.payroll_grade_id}
              onChange={(e) =>
                handleFieldChange('payroll_grade_id', e.target.value)
              }
            />
            <SelectInput
              id="employee-tax-status-input"
              label="Status Pajak"
              placeholder="Pilih status pajak..."
              options={taxStatusOptions}
              disabled={!form.company_id}
              value={form.tax_status_id}
              onChange={(e) =>
                handleFieldChange('tax_status_id', e.target.value)
              }
            />

            <SelectInput
              id="employee-gender-input"
              label="Jenis Kelamin"
              placeholder="Pilih jenis kelamin..."
              options={enums.jenis_kelamin.map((opt) => ({
                value: opt.value,
                label: opt.nama,
              }))}
              value={form.gender}
              onChange={(e) => handleFieldChange('gender', e.target.value)}
            />
            <SelectInput
              id="employee-religion-input"
              label="Agama"
              placeholder="Pilih agama..."
              options={enums.agama.map((opt) => ({
                value: opt.value,
                label: opt.nama,
              }))}
              value={form.religion}
              onChange={(e) => handleFieldChange('religion', e.target.value)}
            />
            <SelectInput
              id="employee-blood-type-input"
              label="Golongan Darah"
              placeholder="Pilih golongan darah..."
              options={enums.golongan_darah.map((opt) => ({
                value: opt.value,
                label: opt.nama,
              }))}
              value={form.blood_type}
              onChange={(e) => handleFieldChange('blood_type', e.target.value)}
            />
            <TextInput
              id="employee-mother-name-input"
              label="Nama Ibu Kandung"
              placeholder="Contoh: Siti Aminah"
              value={form.mother_name}
              onChange={(e) => handleFieldChange('mother_name', e.target.value)}
            />

            <TextInput
              id="employee-birth-place-input"
              label="Tempat Lahir"
              placeholder="Contoh: Bandung"
              value={form.birth_place}
              onChange={(e) => handleFieldChange('birth_place', e.target.value)}
            />
            <TextInput
              id="employee-birth-date-input"
              label="Tanggal Lahir"
              type="date"
              value={form.birth_date}
              onChange={(e) => handleFieldChange('birth_date', e.target.value)}
            />
            <TextInput
              id="employee-email-input"
              label="Email"
              type="email"
              placeholder="Contoh: nadia@foodlab.test"
              value={form.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
            />
            <TextInput
              id="employee-phone-input"
              label="No. Telepon"
              placeholder="Contoh: 081234567801"
              value={form.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
            />

            <TextInput
              id="employee-whatsapp-input"
              label="No. WhatsApp"
              placeholder="Contoh: 081234567801"
              value={form.whatsapp_number}
              onChange={(e) =>
                handleFieldChange('whatsapp_number', e.target.value)
              }
            />
            <TextInput
              id="employee-emergency-phone-input"
              label="No. Telepon Darurat"
              placeholder="Contoh: 081234567899"
              value={form.emergency_phone_number}
              onChange={(e) =>
                handleFieldChange('emergency_phone_number', e.target.value)
              }
            />
            <TextInput
              id="employee-instagram-input"
              label="Instagram"
              placeholder="Contoh: @nadia.lab"
              value={form.instagram}
              onChange={(e) => handleFieldChange('instagram', e.target.value)}
            />
            <TextInput
              id="employee-tiktok-input"
              label="TikTok"
              placeholder="Contoh: @nadia.tiktok"
              value={form.tiktok}
              onChange={(e) => handleFieldChange('tiktok', e.target.value)}
            />

            <TextInput
              id="employee-bpjs-tk-input"
              label="BPJS Ketenagakerjaan"
              placeholder="Nomor BPJS TK"
              value={form.bpjs_ketenagakerjaan}
              onChange={(e) =>
                handleFieldChange('bpjs_ketenagakerjaan', e.target.value)
              }
            />
            <TextInput
              id="employee-bpjs-kes-input"
              label="BPJS Kesehatan"
              placeholder="Nomor BPJS Kesehatan"
              value={form.bpjs_kesehatan}
              onChange={(e) =>
                handleFieldChange('bpjs_kesehatan', e.target.value)
              }
            />
            <TextInput
              id="employee-npwp-input"
              label="Nomor NPWP"
              placeholder="Contoh: 9123456789012000"
              value={form.npwp_number}
              onChange={(e) => handleFieldChange('npwp_number', e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <TextInput
                id="employee-photo-url-input"
                label="URL Foto Karyawan"
                placeholder="Unggah pas foto atau isi URL"
                value={form.photo_url}
                onChange={(e) => handleFieldChange('photo_url', e.target.value)}
              />
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-primary hover:underline">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  aria-label="Unggah Pas Foto"
                  data-testid="employee-photo-file-input"
                  className="hidden"
                  disabled={uploadingDocument}
                  onChange={(e) => void handlePhotoFileChange(e)}
                />
                <span>
                  {uploadingDocument
                    ? 'Mengunggah foto...'
                    : 'Unggah Pas Foto (.jpg/.png)'}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextareaInput
              id="employee-ktp-address-input"
              label="Alamat KTP"
              rows={2}
              placeholder="Alamat sesuai KTP"
              value={form.ktp_address}
              onChange={(e) => handleFieldChange('ktp_address', e.target.value)}
            />
            <TextareaInput
              id="employee-domicile-address-input"
              label="Alamat Domisili"
              rows={2}
              placeholder="Alamat tempat tinggal saat ini"
              value={form.domicile_address}
              onChange={(e) =>
                handleFieldChange('domicile_address', e.target.value)
              }
            />
          </div>

          <div
            className="rounded-xl border border-border bg-muted/30 p-3.5"
            data-testid="employee-documents-section"
          >
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Dokumen Karyawan (EmployeeDocument)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Unggah dokumen melalui DocumentService (
                  {selectedDocTypeMeta?.allowed_formats.join(', ') ??
                    '.pdf, .jpg, .png'}
                  ) atau masukkan URL dokumen.
                </p>
              </div>
              <Badge variant="neutral">{documents.length} dokumen terlampir</Badge>
            </div>

            <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-4">
              <SelectInput
                id="employee-document-type-input"
                label="Jenis Dokumen"
                options={enums.jenis_dokumen.map((opt) => ({
                  value: opt.value,
                  label: opt.nama,
                }))}
                value={docTypeInput}
                onChange={(e) => setDocTypeInput(e.target.value)}
              />
              <TextInput
                id="employee-document-url-input"
                label="URL Dokumen"
                placeholder="https://... atau unggah berkas"
                value={docUrlInput}
                onChange={(e) => setDocUrlInput(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">
                  Unggah Berkas
                </span>
                <label className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/50 bg-card px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/5">
                  <input
                    type="file"
                    accept={
                      selectedDocTypeMeta?.allowed_formats.join(',') ??
                      '.pdf,.jpg,.jpeg,.png,.doc,.docx'
                    }
                    aria-label="Unggah Berkas Dokumen"
                    data-testid="employee-document-file-input"
                    className="hidden"
                    disabled={uploadingDocument}
                    onChange={(e) => void handleDocumentFileChange(e)}
                  />
                  {uploadingDocument ? 'Mengunggah...' : 'Pilih & Unggah File'}
                </label>
              </div>
              <Button
                type="button"
                variant="secondary"
                data-testid="add-employee-document-btn"
                onClick={handleAddDocumentUrl}
              >
                Tambah Dokumen
              </Button>
            </div>

            {documents.length > 0 && (
              <ul
                className="mt-3 flex flex-wrap gap-2"
                data-testid="employee-documents-list"
              >
                {documents.map((doc) => (
                  <li
                    key={doc.document_type}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
                  >
                    <Badge variant="ok">
                      {documentLabelByValue.get(doc.document_type) ??
                        doc.document_type}
                    </Badge>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-[200px] truncate text-primary hover:underline"
                    >
                      {doc.file_url}
                    </a>
                    <button
                      type="button"
                      aria-label={`Hapus dokumen ${doc.document_type}`}
                      onClick={() => handleRemoveDocument(doc.document_type)}
                      className="cursor-pointer font-semibold text-muted-foreground hover:text-red-600"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" disabled={loading}>
              {editingEmployee ? 'Perbarui' : 'Tambah'}
            </Button>
            {editingEmployee && (
              <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                Batal
              </Button>
            )}
          </div>
        </form>

        <DataTable
          columns={columns}
          data={paginatedEmployees}
          rowKey={(row) => row.id}
          emptyMessage="Belum ada data karyawan."
        />

        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={allEmployees.length}
          testId="input-karyawan-pagination"
          onPageChange={setCurrentPage}
        />
      </Modal>

      <ConfirmDialog
        isOpen={isOpen && pendingAction !== null}
        title={confirmDialogConfig.title}
        message={confirmDialogConfig.message}
        loading={loading}
        onConfirm={handleConfirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
};
