import React, { useEffect, useMemo, useState } from 'react';
import type {
  Company,
  Employee,
  EmployeeDocumentInput,
  EmployeePayload,
} from '@/api/client';
import { resolveDocumentUrl } from '@/lib/utils';
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
  ValidationErrorDialog,
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

type DocumentRow = EmployeeDocumentInput & { rowId: number };

interface ValidationPopupState {
  title: string;
  message: string;
  errors: string[];
}

interface EmployeeFormValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Record<string, string>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIK_PATTERN = /^\d{16}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidPastDate(dateStr: string): boolean {
  if (!DATE_PATTERN.test(dateStr)) {
    return false;
  }
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return false;
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dateStr < today;
}

function validateEmployeeForm(
  form: EmployeeFormState,
  documentRows: DocumentRow[]
): EmployeeFormValidationResult {
  const errors: string[] = [];
  const fieldErrors: Record<string, string> = {};

  const recordError = (fieldKey: string, message: string) => {
    if (!fieldErrors[fieldKey]) {
      fieldErrors[fieldKey] = message;
    }
    errors.push(message);
  };

  const requirePositiveInt = (
    fieldKey: keyof EmployeeFormState,
    label: string
  ) => {
    const parsed = parseInt(form[fieldKey], 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      recordError(fieldKey, `${label} wajib dipilih.`);
    }
  };

  const requireText = (
    fieldKey: keyof EmployeeFormState,
    label: string,
    maxLength?: number,
    verb: 'diisi' | 'dipilih' = 'diisi'
  ) => {
    const trimmed = form[fieldKey].trim();
    if (!trimmed) {
      recordError(fieldKey, `${label} wajib ${verb}.`);
      return '';
    }
    if (maxLength && trimmed.length > maxLength) {
      recordError(fieldKey, `${label} maksimal ${maxLength} karakter.`);
    }
    return trimmed;
  };

  requirePositiveInt('company_id', 'Perusahaan');
  requireText('name', 'Nama Lengkap', 150);
  requireText('nickname', 'Nama Panggilan', 100);

  const nik = form.nik_ktp.trim();
  if (!nik) {
    recordError('nik_ktp', 'NIK KTP wajib diisi.');
  } else if (!NIK_PATTERN.test(nik)) {
    recordError('nik_ktp', 'NIK KTP harus terdiri dari 16 digit angka.');
  }

  requirePositiveInt('employee_position_id', 'Jabatan');
  requirePositiveInt('employment_status_id', 'Status Karyawan');
  requirePositiveInt('payroll_grade_id', 'Payroll Grade');
  requirePositiveInt('tax_status_id', 'Status Pajak');

  requireText('gender', 'Jenis Kelamin', 30, 'dipilih');
  requireText('religion', 'Agama', 30, 'dipilih');
  requireText('blood_type', 'Golongan Darah', 10, 'dipilih');
  requireText('mother_name', 'Nama Ibu Kandung', 150);
  requireText('birth_place', 'Tempat Lahir', 100);

  const birthDate = form.birth_date.trim();
  if (!birthDate) {
    recordError('birth_date', 'Tanggal Lahir wajib diisi.');
  } else if (!DATE_PATTERN.test(birthDate)) {
    recordError('birth_date', 'Tanggal Lahir harus berformat YYYY-MM-DD.');
  } else if (!isValidPastDate(birthDate)) {
    recordError('birth_date', 'Tanggal Lahir harus sebelum hari ini.');
  }

  const email = requireText('email', 'Email', 150);
  if (email && !EMAIL_PATTERN.test(email)) {
    recordError('email', 'Format Email tidak valid.');
  }

  requireText('phone', 'No. Telepon', 50);
  requireText('whatsapp_number', 'No. WhatsApp', 30);
  requireText('emergency_phone_number', 'No. Telepon Darurat', 30);
  requireText('instagram', 'Instagram', 100);
  requireText('tiktok', 'TikTok', 100);
  requireText('bpjs_ketenagakerjaan', 'BPJS Ketenagakerjaan', 50);
  requireText('bpjs_kesehatan', 'BPJS Kesehatan', 50);
  requireText('npwp_number', 'Nomor NPWP', 30);
  requireText('photo_url', 'URL Foto Karyawan', 255);
  requireText('ktp_address', 'Alamat KTP');
  requireText('domicile_address', 'Alamat Domisili');

  if (documentRows.length === 0) {
    recordError(
      'documents',
      'Dokumen Karyawan minimal harus melampirkan 1 dokumen.'
    );
  } else {
    const seenTypes = new Set<string>();
    documentRows.forEach((docRow, idx) => {
      const rowNum = idx + 1;
      const docType = docRow.document_type.trim();
      const fileUrl = docRow.file_url.trim();

      if (!docType) {
        recordError(
          `doc_${docRow.rowId}_type`,
          `Dokumen #${rowNum}: Jenis Dokumen wajib dipilih.`
        );
      } else if (seenTypes.has(docType)) {
        recordError(
          `doc_${docRow.rowId}_type`,
          `Dokumen #${rowNum}: Jenis Dokumen tidak boleh duplikat.`
        );
      } else {
        seenTypes.add(docType);
      }

      if (!fileUrl) {
        recordError(
          `doc_${docRow.rowId}_url`,
          `Dokumen #${rowNum}: URL Dokumen wajib diisi atau unggah berkas.`
        );
      } else if (fileUrl.length > 255) {
        recordError(
          `doc_${docRow.rowId}_url`,
          `Dokumen #${rowNum}: URL Dokumen maksimal 255 karakter.`
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

function parseIntStrict(value: string): number {
  return parseInt(value, 10);
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
    errorInfo,
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
  const [nextDocRowId, setNextDocRowId] = useState<number>(2);
  const [documentRows, setDocumentRows] = useState<DocumentRow[]>(() => [
    { rowId: 1, document_type: 'ktp', file_url: '' },
  ]);
  const [uploadingRowId, setUploadingRowId] = useState<number | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingAction, setPendingAction] =
    useState<PendingEmployeeAction | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationPopup, setValidationPopup] =
    useState<ValidationPopupState | null>(null);

  const pageSize = 10;

  const createDefaultDocRow = (
    rowId: number,
    usedTypes: Set<string>
  ): DocumentRow => {
    const nextType =
      enums.jenis_dokumen.find((opt) => !usedTypes.has(opt.value))?.value ??
      enums.jenis_dokumen[0]?.value ??
      'ktp';
    return { rowId, document_type: nextType, file_url: '' };
  };

  useEffect(() => {
    if (isOpen) {
      setForm(createEmptyEmployeeForm(defaultCompanyId));
      setDocumentRows([
        {
          rowId: 1,
          document_type: enums.jenis_dokumen[0]?.value ?? 'ktp',
          file_url: '',
        },
      ]);
      setNextDocRowId(2);
      setUploadingRowId(null);
      setEditingEmployee(null);
      setCurrentPage(1);
      setPendingAction(null);
      setFieldErrors({});
      setValidationPopup(null);
      clearError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultCompanyId]);

  useEffect(() => {
    if (!isOpen || !errorInfo) {
      return;
    }

    if (errorInfo.fieldErrors) {
      const mapped: Record<string, string> = {};
      for (const [key, messages] of Object.entries(errorInfo.fieldErrors)) {
        const firstMsg = messages?.[0];
        if (!firstMsg) {
          continue;
        }
        const docMatch = /^documents\.(\d+)\.(document_type|file_url)$/.exec(
          key
        );
        if (docMatch) {
          const idx = Number(docMatch[1]);
          const row = documentRows[idx];
          if (row) {
            mapped[
              `doc_${row.rowId}_${docMatch[2] === 'document_type' ? 'type' : 'url'}`
            ] = firstMsg;
          }
        } else {
          mapped[key] = firstMsg;
        }
      }
      if (Object.keys(mapped).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      }
    }

    setValidationPopup({
      title: errorInfo.title,
      message: errorInfo.message,
      errors: errorInfo.errors,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorInfo, isOpen]);

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
        .map((p) => ({
          value: String(p.id),
          label: p.code ? `${p.code} - ${p.name}` : p.name,
        })),
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
        .map((s) => ({
          value: String(s.id),
          label: s.code ? `${s.code} - ${s.name}` : s.name,
        })),
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
        .map((t) => ({
          value: String(t.id),
          label: t.code ? `${t.code} - ${t.name}` : t.name,
        })),
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
  const docTypeMetaByValue = useMemo(
    () => new Map(enums.jenis_dokumen.map((item) => [item.value, item])),
    [enums.jenis_dokumen]
  );

  const filledDocuments = useMemo(
    () =>
      documentRows
        .filter((d) => d.document_type && d.file_url.trim() !== '')
        .map((d) => ({
          document_type: d.document_type,
          file_url: d.file_url.trim(),
        })),
    [documentRows]
  );

  const totalPages = Math.max(1, Math.ceil(allEmployees.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEmployees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return allEmployees.slice(start, start + pageSize);
  }, [allEmployees, safeCurrentPage]);

  const clearFieldError = (keys: string[]) => {
    setFieldErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        if (k in next) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const handleFieldChange = (key: keyof EmployeeFormState, value: string) => {
    clearFieldError([key]);
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
      clearFieldError(['photo_url']);
      setForm((prev) => ({ ...prev, photo_url: uploaded.url }));
    }
  };

  const handleDocumentFileChange = async (
    rowId: number,
    documentType: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !documentType) {
      return;
    }
    setUploadingRowId(rowId);
    try {
      const uploaded = await uploadDocument(file, documentType);
      if (uploaded?.url) {
        clearFieldError([`doc_${rowId}_url`, 'documents']);
        setDocumentRows((prev) =>
          prev.map((row) =>
            row.rowId === rowId ? { ...row, file_url: uploaded.url } : row
          )
        );
      }
    } finally {
      setUploadingRowId(null);
    }
  };

  const handleAddDocumentRow = () => {
    clearFieldError(['documents']);
    const usedTypes = new Set(documentRows.map((row) => row.document_type));
    const newRow = createDefaultDocRow(nextDocRowId, usedTypes);
    setNextDocRowId((prev) => prev + 1);
    setDocumentRows((prev) => [...prev, newRow]);
  };

  const handleUpdateDocumentRow = (
    rowId: number,
    patch: Partial<EmployeeDocumentInput>
  ) => {
    clearFieldError([`doc_${rowId}_type`, `doc_${rowId}_url`, 'documents']);
    setDocumentRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row))
    );
  };

  const handleRemoveDocumentRow = (rowId: number) => {
    clearFieldError([`doc_${rowId}_type`, `doc_${rowId}_url`, 'documents']);
    setDocumentRows((prev) => prev.filter((row) => row.rowId !== rowId));
  };

  const buildPayload = (): EmployeePayload => {
    return {
      company_id: parseIntStrict(form.company_id),
      employee_position_id: parseIntStrict(form.employee_position_id),
      employment_status_id: parseIntStrict(form.employment_status_id),
      payroll_grade_id: parseIntStrict(form.payroll_grade_id),
      tax_status_id: parseIntStrict(form.tax_status_id),
      name: form.name.trim(),
      nickname: form.nickname.trim(),
      nik_ktp: form.nik_ktp.trim(),
      birth_place: form.birth_place.trim(),
      birth_date: form.birth_date.trim(),
      gender: form.gender.trim(),
      religion: form.religion.trim(),
      blood_type: form.blood_type.trim(),
      mother_name: form.mother_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      whatsapp_number: form.whatsapp_number.trim(),
      emergency_phone_number: form.emergency_phone_number.trim(),
      instagram: form.instagram.trim(),
      tiktok: form.tiktok.trim(),
      ktp_address: form.ktp_address.trim(),
      domicile_address: form.domicile_address.trim(),
      bpjs_ketenagakerjaan: form.bpjs_ketenagakerjaan.trim(),
      bpjs_kesehatan: form.bpjs_kesehatan.trim(),
      npwp_number: form.npwp_number.trim(),
      photo_url: form.photo_url.trim(),
      documents: filledDocuments,
    };
  };

  const resetFormAndDocuments = () => {
    setForm(createEmptyEmployeeForm(defaultCompanyId));
    setDocumentRows([
      {
        rowId: nextDocRowId,
        document_type: enums.jenis_dokumen[0]?.value ?? 'ktp',
        file_url: '',
      },
    ]);
    setNextDocRowId((prev) => prev + 1);
    setFieldErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateEmployeeForm(form, documentRows);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      setValidationPopup({
        title: 'Validasi Formulir Gagal',
        message:
          'Semua kolom formulir wajib diisi dan minimal 1 dokumen karyawan harus dilampirkan.',
        errors: validation.errors,
      });
      return;
    }

    setFieldErrors({});
    setValidationPopup(null);
    const payload = buildPayload();
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
        resetFormAndDocuments();
        setCurrentPage(1);
      }
    } else if (action.type === 'update') {
      const updated = await updateEmployee(action.id, action.payload);
      if (updated) {
        setEditingEmployee(null);
        resetFormAndDocuments();
      }
    } else if (action.type === 'delete') {
      const removed = await removeEmployee(action.id);
      if (removed && editingEmployee?.id === action.id) {
        setEditingEmployee(null);
        resetFormAndDocuments();
      }
    }
  };

  const handleStartEdit = (employee: Employee) => {
    clearError();
    setFieldErrors({});
    setValidationPopup(null);
    setEditingEmployee(employee);
    setForm(employeeToFormState(employee));
    const existingDocs = employee.documents ?? [];
    if (existingDocs.length > 0) {
      const baseId = nextDocRowId;
      setDocumentRows(
        existingDocs.map((doc, idx) => ({
          rowId: baseId + idx,
          document_type: doc.document_type,
          file_url: doc.file_url,
        }))
      );
      setNextDocRowId(baseId + existingDocs.length);
    } else {
      setDocumentRows([
        {
          rowId: nextDocRowId,
          document_type: enums.jenis_dokumen[0]?.value ?? 'ktp',
          file_url: '',
        },
      ]);
      setNextDocRowId((prev) => prev + 1);
    }
  };

  const handleCancelEdit = () => {
    clearError();
    setFieldErrors({});
    setValidationPopup(null);
    setEditingEmployee(null);
    resetFormAndDocuments();
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
      key: 'employee_attendance_code',
      header: 'Kode Absensi',
      render: (row) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
          {row.employee_attendance_code ?? '-'}
        </code>
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
        subtitle="Kelola data karyawan, enum agama & golongan darah, serta unggah dokumen"
        testId="input-karyawan-crud-modal"
        maxWidthClass="max-w-[95vw]"
        dialogClassName="h-[92vh] max-h-[92vh]"
        bodyClassName="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden"
        onClose={onClose}
      >
        {error && (
          <div
            role="alert"
            className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div
          data-testid="input-karyawan-crud-modal-split-layout"
          className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]"
        >
          <div
            data-testid="input-karyawan-crud-modal-form-panel"
            className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/25 p-4 lg:overflow-y-auto"
          >
            <form
              noValidate
              onSubmit={handleSubmit}
              data-testid="input-karyawan-crud-modal-form"
              className="flex flex-col gap-4"
            >
              <div className="border-b border-border pb-2.5">
                <h3 className="text-sm font-semibold text-foreground">
                  {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Data Karyawan'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {editingEmployee
                    ? 'Perbarui data karyawan yang dipilih. Semua kolom wajib diisi dan minimal 1 dokumen harus terlampir.'
                    : 'Lengkapi seluruh kolom di bawah ini dan unggah minimal 1 dokumen untuk menambahkan karyawan baru.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <SelectInput
                  id="employee-company-input"
                  label="Pilih Perusahaan"
                  labelPlacement="left"
                  placeholder="Pilih perusahaan..."
                  options={companyOptions}
                  value={form.company_id}
                  error={fieldErrors.company_id}
                  onChange={(e) =>
                    handleFieldChange('company_id', e.target.value)
                  }
                />
                <TextInput
                  id="employee-name-input"
                  label="Nama Lengkap"
                  labelPlacement="left"
                  placeholder="Contoh: Nadia Putri Pratiwi"
                  required
                  value={form.name}
                  error={fieldErrors.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
                <TextInput
                  id="employee-nickname-input"
                  label="Nama Panggilan"
                  labelPlacement="left"
                  placeholder="Contoh: Nadia"
                  value={form.nickname}
                  error={fieldErrors.nickname}
                  onChange={(e) =>
                    handleFieldChange('nickname', e.target.value)
                  }
                />
                <TextInput
                  id="employee-nik-ktp-input"
                  label="NIK KTP (16 Digit)"
                  labelPlacement="left"
                  placeholder="Contoh: 3273011504960001"
                  maxLength={16}
                  value={form.nik_ktp}
                  error={fieldErrors.nik_ktp}
                  onChange={(e) => handleFieldChange('nik_ktp', e.target.value)}
                />

                <SelectInput
                  id="employee-position-input"
                  label="Jabatan"
                  labelPlacement="left"
                  placeholder="Pilih jabatan..."
                  options={positionOptions}
                  disabled={!form.company_id}
                  value={form.employee_position_id}
                  error={fieldErrors.employee_position_id}
                  onChange={(e) =>
                    handleFieldChange('employee_position_id', e.target.value)
                  }
                />
                <SelectInput
                  id="employee-status-input"
                  label="Status Karyawan"
                  labelPlacement="left"
                  placeholder="Pilih status..."
                  options={statusOptions}
                  disabled={!form.company_id}
                  value={form.employment_status_id}
                  error={fieldErrors.employment_status_id}
                  onChange={(e) =>
                    handleFieldChange('employment_status_id', e.target.value)
                  }
                />
                <SelectInput
                  id="employee-grade-input"
                  label="Payroll Grade"
                  labelPlacement="left"
                  placeholder="Pilih payroll grade..."
                  options={gradeOptions}
                  disabled={!form.company_id}
                  value={form.payroll_grade_id}
                  error={fieldErrors.payroll_grade_id}
                  onChange={(e) =>
                    handleFieldChange('payroll_grade_id', e.target.value)
                  }
                />
                <SelectInput
                  id="employee-tax-status-input"
                  label="Status Pajak"
                  labelPlacement="left"
                  placeholder="Pilih status pajak..."
                  options={taxStatusOptions}
                  disabled={!form.company_id}
                  value={form.tax_status_id}
                  error={fieldErrors.tax_status_id}
                  onChange={(e) =>
                    handleFieldChange('tax_status_id', e.target.value)
                  }
                />

                <SelectInput
                  id="employee-gender-input"
                  label="Jenis Kelamin"
                  labelPlacement="left"
                  placeholder="Pilih jenis kelamin..."
                  options={enums.jenis_kelamin.map((opt) => ({
                    value: opt.value,
                    label: opt.nama,
                  }))}
                  value={form.gender}
                  error={fieldErrors.gender}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                />
                <SelectInput
                  id="employee-religion-input"
                  label="Agama"
                  labelPlacement="left"
                  placeholder="Pilih agama..."
                  options={enums.agama.map((opt) => ({
                    value: opt.value,
                    label: opt.nama,
                  }))}
                  value={form.religion}
                  error={fieldErrors.religion}
                  onChange={(e) =>
                    handleFieldChange('religion', e.target.value)
                  }
                />
                <SelectInput
                  id="employee-blood-type-input"
                  label="Golongan Darah"
                  labelPlacement="left"
                  placeholder="Pilih golongan darah..."
                  options={enums.golongan_darah.map((opt) => ({
                    value: opt.value,
                    label: opt.nama,
                  }))}
                  value={form.blood_type}
                  error={fieldErrors.blood_type}
                  onChange={(e) =>
                    handleFieldChange('blood_type', e.target.value)
                  }
                />
                <TextInput
                  id="employee-mother-name-input"
                  label="Nama Ibu Kandung"
                  labelPlacement="left"
                  placeholder="Contoh: Siti Aminah"
                  value={form.mother_name}
                  error={fieldErrors.mother_name}
                  onChange={(e) =>
                    handleFieldChange('mother_name', e.target.value)
                  }
                />

                <TextInput
                  id="employee-birth-place-input"
                  label="Tempat Lahir"
                  labelPlacement="left"
                  placeholder="Contoh: Bandung"
                  value={form.birth_place}
                  error={fieldErrors.birth_place}
                  onChange={(e) =>
                    handleFieldChange('birth_place', e.target.value)
                  }
                />
                <TextInput
                  id="employee-birth-date-input"
                  label="Tanggal Lahir"
                  labelPlacement="left"
                  type="date"
                  value={form.birth_date}
                  error={fieldErrors.birth_date}
                  onChange={(e) =>
                    handleFieldChange('birth_date', e.target.value)
                  }
                />
                <TextInput
                  id="employee-email-input"
                  label="Email"
                  labelPlacement="left"
                  type="email"
                  placeholder="Contoh: nadia@foodlab.test"
                  value={form.email}
                  error={fieldErrors.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
                <TextInput
                  id="employee-phone-input"
                  label="No. Telepon"
                  labelPlacement="left"
                  placeholder="Contoh: 081234567801"
                  value={form.phone}
                  error={fieldErrors.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />

                <TextInput
                  id="employee-whatsapp-input"
                  label="No. WhatsApp"
                  labelPlacement="left"
                  placeholder="Contoh: 081234567801"
                  value={form.whatsapp_number}
                  error={fieldErrors.whatsapp_number}
                  onChange={(e) =>
                    handleFieldChange('whatsapp_number', e.target.value)
                  }
                />
                <TextInput
                  id="employee-emergency-phone-input"
                  label="No. Telepon Darurat"
                  labelPlacement="left"
                  placeholder="Contoh: 081234567899"
                  value={form.emergency_phone_number}
                  error={fieldErrors.emergency_phone_number}
                  onChange={(e) =>
                    handleFieldChange('emergency_phone_number', e.target.value)
                  }
                />
                <TextInput
                  id="employee-instagram-input"
                  label="Instagram"
                  labelPlacement="left"
                  placeholder="Contoh: @nadia.lab"
                  value={form.instagram}
                  error={fieldErrors.instagram}
                  onChange={(e) =>
                    handleFieldChange('instagram', e.target.value)
                  }
                />
                <TextInput
                  id="employee-tiktok-input"
                  label="TikTok"
                  labelPlacement="left"
                  placeholder="Contoh: @nadia.tiktok"
                  value={form.tiktok}
                  error={fieldErrors.tiktok}
                  onChange={(e) => handleFieldChange('tiktok', e.target.value)}
                />

                <TextInput
                  id="employee-bpjs-tk-input"
                  label="BPJS Ketenagakerjaan"
                  labelPlacement="left"
                  placeholder="Nomor BPJS TK"
                  value={form.bpjs_ketenagakerjaan}
                  error={fieldErrors.bpjs_ketenagakerjaan}
                  onChange={(e) =>
                    handleFieldChange('bpjs_ketenagakerjaan', e.target.value)
                  }
                />
                <TextInput
                  id="employee-bpjs-kes-input"
                  label="BPJS Kesehatan"
                  labelPlacement="left"
                  placeholder="Nomor BPJS Kesehatan"
                  value={form.bpjs_kesehatan}
                  error={fieldErrors.bpjs_kesehatan}
                  onChange={(e) =>
                    handleFieldChange('bpjs_kesehatan', e.target.value)
                  }
                />
                <TextInput
                  id="employee-npwp-input"
                  label="Nomor NPWP"
                  labelPlacement="left"
                  placeholder="Contoh: 9123456789012000"
                  value={form.npwp_number}
                  error={fieldErrors.npwp_number}
                  onChange={(e) =>
                    handleFieldChange('npwp_number', e.target.value)
                  }
                />
                <div className="flex flex-col gap-1.5">
                  <TextInput
                    id="employee-photo-url-input"
                    label="URL Foto Karyawan"
                    labelPlacement="left"
                    placeholder="Unggah pas foto atau isi URL"
                    value={form.photo_url}
                    error={fieldErrors.photo_url}
                    onChange={(e) =>
                      handleFieldChange('photo_url', e.target.value)
                    }
                  />
                  <div className="flex items-center justify-between gap-2 sm:pl-[152px]">
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
                    {form.photo_url.trim() !== '' && (
                      <a
                        href={resolveDocumentUrl(form.photo_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Lihat
                      </a>
                    )}
                  </div>
                </div>

                <TextareaInput
                  id="employee-ktp-address-input"
                  label="Alamat KTP"
                  labelPlacement="left"
                  rows={2}
                  placeholder="Alamat sesuai KTP"
                  value={form.ktp_address}
                  error={fieldErrors.ktp_address}
                  onChange={(e) =>
                    handleFieldChange('ktp_address', e.target.value)
                  }
                />
                <TextareaInput
                  id="employee-domicile-address-input"
                  label="Alamat Domisili"
                  labelPlacement="left"
                  rows={2}
                  placeholder="Alamat tempat tinggal saat ini"
                  value={form.domicile_address}
                  error={fieldErrors.domicile_address}
                  onChange={(e) =>
                    handleFieldChange('domicile_address', e.target.value)
                  }
                />
              </div>

              <div
                className={`rounded-xl border bg-card/70 p-3.5 ${
                  fieldErrors.documents ? 'border-red-500' : 'border-border'
                }`}
                data-testid="employee-documents-section"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Dokumen Karyawan (EmployeeDocument)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Minimal 1 dokumen wajib dilampirkan. Unggah berkas atau masukkan URL.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">
                      {filledDocuments.length} dokumen terlampir
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      data-testid="add-employee-document-btn"
                      disabled={
                        documentRows.length >= enums.jenis_dokumen.length
                      }
                      onClick={handleAddDocumentRow}
                    >
                      + Tambah Dokumen
                    </Button>
                  </div>
                </div>

                {fieldErrors.documents && (
                  <p className="mb-2 text-xs font-medium text-red-600" role="status">
                    {fieldErrors.documents}
                  </p>
                )}

                {documentRows.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-card px-3 py-3 text-center text-xs text-muted-foreground">
                    Belum ada baris dokumen. Klik &ldquo;+ Tambah Dokumen&rdquo;
                    untuk menambahkan dokumen (minimal 1 dokumen).
                  </p>
                ) : (
                  <div
                    className="flex flex-col gap-2.5"
                    data-testid="employee-documents-list"
                  >
                    {documentRows.map((docRow, index) => {
                      const rowDocMeta = docTypeMetaByValue.get(
                        docRow.document_type
                      );
                      const usedByOtherRows = new Set(
                        documentRows
                          .filter((r) => r.rowId !== docRow.rowId)
                          .map((r) => r.document_type)
                      );
                      const rowOptions = enums.jenis_dokumen
                        .filter(
                          (opt) =>
                            opt.value === docRow.document_type ||
                            !usedByOtherRows.has(opt.value)
                        )
                        .map((opt) => ({
                          value: opt.value,
                          label: opt.nama,
                        }));
                      const isRowUploading =
                        uploadingDocument && uploadingRowId === docRow.rowId;

                      return (
                        <div
                          key={docRow.rowId}
                          data-testid={`employee-document-row-${index}`}
                          className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3"
                        >
                          <SelectInput
                            id={`employee-document-type-input-${docRow.rowId}`}
                            label="Jenis Dokumen"
                            labelPlacement="left"
                            options={rowOptions}
                            value={docRow.document_type}
                            error={fieldErrors[`doc_${docRow.rowId}_type`]}
                            onChange={(e) =>
                              handleUpdateDocumentRow(docRow.rowId, {
                                document_type: e.target.value,
                              })
                            }
                          />
                          <TextInput
                            id={`employee-document-url-input-${docRow.rowId}`}
                            label="URL Dokumen"
                            labelPlacement="left"
                            placeholder="https://... atau unggah berkas"
                            value={docRow.file_url}
                            error={fieldErrors[`doc_${docRow.rowId}_url`]}
                            onChange={(e) =>
                              handleUpdateDocumentRow(docRow.rowId, {
                                file_url: e.target.value,
                              })
                            }
                          />
                          <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
                            <span className="text-xs font-medium leading-snug text-foreground">
                              Unggah Berkas (
                              {rowDocMeta?.allowed_formats.join(', ') ??
                                '.pdf, .jpg, .png'}
                              )
                            </span>
                            <label className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/50 bg-background px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/5">
                              <input
                                type="file"
                                accept={
                                  rowDocMeta?.allowed_formats.join(',') ??
                                  '.pdf,.jpg,.jpeg,.png,.doc,.docx'
                                }
                                aria-label={`Unggah Berkas Dokumen ${rowDocMeta?.nama ?? index + 1}`}
                                data-testid={
                                  index === 0
                                    ? 'employee-document-file-input'
                                    : `employee-document-file-input-${index}`
                                }
                                className="hidden"
                                disabled={uploadingDocument}
                                onChange={(e) =>
                                  void handleDocumentFileChange(
                                    docRow.rowId,
                                    docRow.document_type,
                                    e
                                  )
                                }
                              />
                              {isRowUploading
                                ? 'Mengunggah...'
                                : 'Pilih & Unggah File'}
                            </label>
                          </div>
                          <div className="flex items-center justify-end gap-1.5">
                            {docRow.file_url.trim() !== '' && (
                              <a
                                href={resolveDocumentUrl(docRow.file_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-xs font-medium text-primary hover:bg-muted"
                              >
                                Lihat
                              </a>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              data-testid={`remove-employee-document-row-${index}`}
                              onClick={() =>
                                handleRemoveDocumentRow(docRow.rowId)
                              }
                            >
                              Hapus
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button type="submit" variant="primary" disabled={loading}>
                  {editingEmployee ? 'Perbarui' : 'Tambah'}
                </Button>
                {editingEmployee && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelEdit}
                  >
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div
            data-testid="input-karyawan-crud-modal-table-panel"
            className="flex min-h-0 min-w-0 flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Daftar Karyawan
                </h3>
                <Badge variant="neutral">{allEmployees.length} karyawan</Badge>
              </div>
              <DataTable
                columns={columns}
                data={paginatedEmployees}
                rowKey={(row) => row.id}
                emptyMessage="Belum ada data karyawan."
              />
            </div>

            <div className="shrink-0 border-t border-border pt-3">
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={allEmployees.length}
                testId="input-karyawan-pagination"
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isOpen && pendingAction !== null}
        title={confirmDialogConfig.title}
        message={confirmDialogConfig.message}
        loading={loading}
        onConfirm={handleConfirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />

      <ValidationErrorDialog
        isOpen={isOpen && validationPopup !== null}
        title={validationPopup?.title}
        message={validationPopup?.message}
        errors={validationPopup?.errors ?? []}
        onClose={() => setValidationPopup(null)}
      />
    </>
  );
};
