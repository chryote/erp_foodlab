import { getActiveCompanyId } from '@/lib/activeCompanyStorage';
import { clearAuthToken, getAuthToken } from '@/lib/authStorage';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  checks: {
    database: 'ok' | 'error';
    cache_redis: 'ok' | 'error';
  };
  timestamp: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  data: {
    user: AuthUser;
    token: string;
    token_type: string;
  };
}

export interface LabSample {
  id: number;
  batch_code: string;
  product_name: string;
  category: string;
  ph_level: number;
  moisture_percent: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

export interface SamplesListResponse {
  data: LabSample[];
  meta: {
    count: number;
    cache_key: string;
  };
}

export type ErpModuleCode = 'CFO' | 'CHO' | 'CPO' | 'CDO' | 'CMO';

export interface ErpModuleOverview {
  code: ErpModuleCode;
  title: string;
  subtitle: string;
  status: string;
  primary_kpi: {
    label: string;
    value: string;
    trend: string;
  };
  highlights: Array<{
    label: string;
    value: string;
  }>;
  recent_items: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export interface ErpModulesListResponse {
  data: ErpModuleOverview[];
  meta: {
    count: number;
  };
}

export interface Company {
  id: number;
  name: string;
  series?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface CompaniesListResponse {
  data: Company[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface CapitalCompany {
  id: number;
  company_id: number;
  stakeholder_name: string;
  capital: number;
  company?: Company | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface CapitalCompaniesListResponse {
  data: CapitalCompany[];
  meta: {
    count: number;
    total?: number;
    total_capital?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface ExpenseCategory {
  id: number;
  company_id: number;
  name: string;
  company?: Company | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ExpenseCategoriesListResponse {
  data: ExpenseCategory[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface ExpenseType {
  id: number;
  expense_category_id: number;
  company_id: number;
  name: string;
  expense_category?: ExpenseCategory | null;
  company?: Company | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ExpenseTypesListResponse {
  data: ExpenseType[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface ExpenseItem {
  id: number;
  expense_category_id: number;
  expense_type_id: number;
  company_id: number;
  name: string;
  amount: number;
  purchased_on?: string | null;
  closing_date?: string | null;
  employee_id?: number | null;
  detail?: string | null;
  expense_category?: ExpenseCategory | null;
  expense_type?: ExpenseType | null;
  company?: Company | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ExpenseItemsListResponse {
  data: ExpenseItem[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface CompanyAsset {
  id: number;
  company_id: number;
  asset_date: string;
  name: string;
  amount: number;
  price_per_unit: number;
  total_price: number;
  company?: Company | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface CompanyAssetsListResponse {
  data: CompanyAsset[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface EnumOption {
  value: string;
  nama: string;
}

export interface DocumentTypeOption extends EnumOption {
  allowed_formats: string[];
}

export interface ChoEnums {
  agama: EnumOption[];
  golongan_darah: EnumOption[];
  jenis_kelamin: EnumOption[];
  jenis_dokumen: DocumentTypeOption[];
}

export interface EmployeePosition {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface EmployeePositionPayload {
  code?: string | null;
  name: string;
  description?: string | null;
}

export interface EmployeePositionsListResponse {
  data: EmployeePosition[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface EmploymentStatus {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface EmploymentStatusPayload {
  code?: string | null;
  name: string;
  description?: string | null;
}

export interface EmploymentStatusesListResponse {
  data: EmploymentStatus[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface PayrollGrade {
  id: number;
  grade: number;
  sub_grade: string;
  level_label?: string | null;
  base_salary: number;
  position_allowance: number;
  total_gross: number;
  bpjs_kesehatan_company: number;
  bpjs_kesehatan_employee: number;
  bpjs_ketenagakerjaan_company: number;
  bpjs_ketenagakerjaan_employee: number;
  net_employee_received: number;
  total_company_cost: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PayrollGradePayload {
  grade: number;
  sub_grade: string;
  level_label?: string | null;
  base_salary: number;
  position_allowance?: number | null;
}

export interface PayrollGradesListResponse {
  data: PayrollGrade[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface TaxStatus {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface TaxStatusPayload {
  code?: string | null;
  name: string;
  description?: string | null;
}

export interface TaxStatusesListResponse {
  data: TaxStatus[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_type: string;
  file_url: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface EmployeeDocumentInput {
  document_type: string;
  file_url: string;
}

export interface Employee {
  id: number;
  company_id: number;
  employee_position_id?: number | null;
  employment_status_id?: number | null;
  payroll_grade_id?: number | null;
  tax_status_id?: number | null;
  employee_attendance_code?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  nik_ktp?: string | null;
  nickname?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  religion?: string | null;
  blood_type?: string | null;
  mother_name?: string | null;
  ktp_address?: string | null;
  domicile_address?: string | null;
  whatsapp_number?: string | null;
  emergency_phone_number?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  bpjs_ketenagakerjaan?: string | null;
  bpjs_kesehatan?: string | null;
  npwp_number?: string | null;
  company?: Company | null;
  employee_position?: EmployeePosition | null;
  employment_status?: EmploymentStatus | null;
  payroll_grade?: PayrollGrade | null;
  tax_status?: TaxStatus | null;
  documents?: EmployeeDocument[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface EmployeePayload {
  company_id: number;
  employee_position_id?: number | null;
  employment_status_id?: number | null;
  payroll_grade_id?: number | null;
  tax_status_id?: number | null;
  employee_attendance_code?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  nik_ktp?: string | null;
  nickname?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  religion?: string | null;
  blood_type?: string | null;
  mother_name?: string | null;
  ktp_address?: string | null;
  domicile_address?: string | null;
  whatsapp_number?: string | null;
  emergency_phone_number?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  bpjs_ketenagakerjaan?: string | null;
  bpjs_kesehatan?: string | null;
  npwp_number?: string | null;
  documents?: EmployeeDocumentInput[];
}

export interface EmployeesListResponse {
  data: Employee[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface UploadedDocumentResponse {
  path: string;
  disk: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
}

export type PayrollGroup = 'office' | 'outlet';

export type PayrollItemStatus = 'draft' | 'finalized';

export interface PayrollRun {
  id: number;
  company_id: number;
  code?: string | null;
  name: string;
  period_date: string;
  status: 'draft' | 'pending' | 'approved' | 'void';
  total_base_salary: number;
  total_bpjs_kesehatan: number;
  total_bpjs_ketenagakerjaan: number;
  total_bonus: number;
  total_overtime: number;
  total_deduction: number;
  total_thr: number;
  total_pph21: number;
  total_net: number;
  notes?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
}

export interface PayrollItem {
  id: number;
  company_id: number;
  payroll_run_id: number;
  employee_id: number;
  employee_position_id?: number | null;
  payroll_group: PayrollGroup;
  attendance_days: number;
  bank_account_number?: string | null;
  base_salary: number;
  bpjs_kesehatan: number;
  bpjs_ketenagakerjaan: number;
  bonus: number;
  overtime: number;
  deduction: number;
  thr: number;
  pph21: number;
  total_net: number;
  status: PayrollItemStatus;
  notes?: string | null;
  finalized_by?: number | null;
  finalized_at?: string | null;
  company?: Company | null;
  payroll_run?: PayrollRun | null;
  employee?: Employee | null;
  employee_position?: EmployeePosition | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PayrollWorkspaceRow {
  employee_id: number;
  employee: Employee;
  payroll_item_id: number | null;
  payroll_run_id: number | null;
  payroll_group: PayrollGroup;
  attendance_days: number;
  effective_work_days: number;
  bank_account_number?: string | null;
  base_salary: number;
  bpjs_kesehatan: number;
  bpjs_ketenagakerjaan: number;
  bonus: number;
  overtime: number;
  deduction: number;
  thr: number;
  pph21: number;
  total_net: number;
  status: PayrollItemStatus;
  notes?: string | null;
  finalized_by?: number | null;
  finalized_at?: string | null;
}

export interface PayrollWorkspaceData {
  period: string;
  period_date: string;
  cutoff_start_date: string;
  cutoff_end_date: string;
  cutoff_day: number;
  period_start_day: number;
  effective_work_days: number;
  company: Company;
  payroll_run: PayrollRun | null;
  rows: PayrollWorkspaceRow[];
}

export interface SaveEmployeePayrollPayload {
  company_id: number;
  employee_id: number;
  period: string;
  payroll_group?: PayrollGroup;
  bank_account_number?: string | null;
  bonus: number;
  overtime: number;
  deduction: number;
  thr: number;
  notes?: string | null;
}

export interface EmployeeShift {
  id: number;
  company_id: number;
  code?: string | null;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  grace_period_minutes: number;
  is_overnight: boolean;
  status: string;
  description?: string | null;
  company?: Company | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface EmployeeShiftPayload {
  company_id: number;
  code?: string | null;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes?: number | null;
  grace_period_minutes?: number | null;
  is_overnight?: boolean;
  status?: string;
  description?: string | null;
}

export interface EmployeeShiftsListResponse {
  data: EmployeeShift[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface EmployeeShiftAssignment {
  id: number;
  company_id: number;
  employee_id: number;
  employee_shift_id: number;
  effective_date: string;
  end_date?: string | null;
  notes?: string | null;
  company?: Company | null;
  employee?: Employee | null;
  employee_shift?: EmployeeShift | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface EmployeeShiftAssignmentPayload {
  company_id: number;
  employee_id: number;
  employee_shift_id: number;
  effective_date: string;
  end_date?: string | null;
  notes?: string | null;
}

export interface EmployeeShiftAssignmentsListResponse {
  data: EmployeeShiftAssignment[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface EmployeeAttendance {
  id: number;
  company_id: number;
  employee_id: number;
  employee_shift_id?: number | null;
  attendance_date: string;
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  late_minutes: number;
  overtime_minutes: number;
  status: string;
  notes?: string | null;
  company?: Company | null;
  employee?: Employee | null;
  employee_shift?: EmployeeShift | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface EmployeeAttendancePayload {
  company_id: number;
  employee_id: number;
  employee_shift_id?: number | null;
  attendance_date: string;
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  late_minutes?: number | null;
  overtime_minutes?: number | null;
  status?: string;
  notes?: string | null;
}

export interface EmployeeAttendancesListResponse {
  data: EmployeeAttendance[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) {
    return '/api';
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
}

const API_BASE_URL = resolveApiBaseUrl();

export class ApiRequestError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
  }
}

async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {},
  errorPrefix = 'Request failed'
): Promise<T> {
  let response: Response;
  try {
    const token = getAuthToken();
    const activeCompanyId = getActiveCompanyId();
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(activeCompanyId !== null
          ? { 'X-Active-Company-Id': String(activeCompanyId) }
          : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Tidak dapat terhubung ke server API (${API_BASE_URL}${endpoint}): ${detail}`
    );
  }

  if (response.status === 401) {
    clearAuthToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('erp:unauthorized'));
    }
  }

  if (!response.ok) {
    let serverMessage = '';
    let validationErrors: Record<string, string[]> | undefined;
    try {
      const errBody = (await response.json()) as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (errBody?.message) {
        serverMessage = ` - ${errBody.message.split('\n')[0]}`;
      }
      if (errBody?.errors && typeof errBody.errors === 'object') {
        validationErrors = errBody.errors;
      }
    } catch {
      // Ignore non-JSON error bodies
    }
    throw new ApiRequestError(
      `${errorPrefix}: ${response.status}${serverMessage}`,
      response.status,
      validationErrors
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchHealthStatus(): Promise<HealthResponse> {
  return requestJson<HealthResponse>(
    '/health',
    {},
    'Health check failed with status'
  );
}

export async function fetchErpModules(): Promise<ErpModulesListResponse> {
  return requestJson<ErpModulesListResponse>(
    '/v1/modules',
    {},
    'Failed to fetch ERP modules'
  );
}

export async function fetchLabSamples(): Promise<SamplesListResponse> {
  return requestJson<SamplesListResponse>(
    '/v1/samples',
    {},
    'Failed to fetch samples'
  );
}

export async function fetchCompanies(): Promise<CompaniesListResponse> {
  return requestJson<CompaniesListResponse>(
    '/v1/modules/cfo/companies',
    {},
    'Failed to fetch companies'
  );
}

export async function createCompany(payload: {
  name: string;
  series?: number;
}): Promise<{ data: Company }> {
  return requestJson<{ data: Company }>(
    '/v1/modules/cfo/companies',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create company'
  );
}

export async function updateCompany(
  id: number,
  payload: { name: string; series?: number }
): Promise<{ data: Company }> {
  return requestJson<{ data: Company }>(
    `/v1/modules/cfo/companies/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update company'
  );
}

export async function deleteCompany(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cfo/companies/${id}`,
    { method: 'DELETE' },
    'Failed to delete company'
  );
}

export async function fetchCapitalCompanies(): Promise<CapitalCompaniesListResponse> {
  return requestJson<CapitalCompaniesListResponse>(
    '/v1/modules/cfo/capital-companies',
    {},
    'Failed to fetch capital companies'
  );
}

export async function createCapitalCompany(payload: {
  company_id: number;
  stakeholder_name: string;
  capital: number;
}): Promise<{ data: CapitalCompany }> {
  return requestJson<{ data: CapitalCompany }>(
    '/v1/modules/cfo/capital-companies',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create capital company'
  );
}

export async function updateCapitalCompany(
  id: number,
  payload: { company_id: number; stakeholder_name: string; capital: number }
): Promise<{ data: CapitalCompany }> {
  return requestJson<{ data: CapitalCompany }>(
    `/v1/modules/cfo/capital-companies/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update capital company'
  );
}

export async function deleteCapitalCompany(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cfo/capital-companies/${id}`,
    { method: 'DELETE' },
    'Failed to delete capital company'
  );
}

export async function fetchExpenseCategories(): Promise<ExpenseCategoriesListResponse> {
  return requestJson<ExpenseCategoriesListResponse>(
    '/v1/modules/cfo/expense-categories',
    {},
    'Failed to fetch expense categories'
  );
}

export async function createExpenseCategory(payload: {
  company_id: number;
  name: string;
}): Promise<{ data: ExpenseCategory }> {
  return requestJson<{ data: ExpenseCategory }>(
    '/v1/modules/cfo/expense-categories',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create expense category'
  );
}

export async function updateExpenseCategory(
  id: number,
  payload: { company_id: number; name: string }
): Promise<{ data: ExpenseCategory }> {
  return requestJson<{ data: ExpenseCategory }>(
    `/v1/modules/cfo/expense-categories/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update expense category'
  );
}

export async function deleteExpenseCategory(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cfo/expense-categories/${id}`,
    { method: 'DELETE' },
    'Failed to delete expense category'
  );
}

export async function fetchExpenseTypes(): Promise<ExpenseTypesListResponse> {
  return requestJson<ExpenseTypesListResponse>(
    '/v1/modules/cfo/expense-types',
    {},
    'Failed to fetch expense types'
  );
}

export async function createExpenseType(payload: {
  company_id: number;
  expense_category_id: number;
  name: string;
}): Promise<{ data: ExpenseType }> {
  return requestJson<{ data: ExpenseType }>(
    '/v1/modules/cfo/expense-types',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create expense type'
  );
}

export async function updateExpenseType(
  id: number,
  payload: { company_id: number; expense_category_id: number; name: string }
): Promise<{ data: ExpenseType }> {
  return requestJson<{ data: ExpenseType }>(
    `/v1/modules/cfo/expense-types/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update expense type'
  );
}

export async function deleteExpenseType(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cfo/expense-types/${id}`,
    { method: 'DELETE' },
    'Failed to delete expense type'
  );
}

export async function fetchExpenseItems(): Promise<ExpenseItemsListResponse> {
  return requestJson<ExpenseItemsListResponse>(
    '/v1/modules/cfo/expense-items',
    {},
    'Failed to fetch expense items'
  );
}

export interface ExpenseItemPayload {
  expense_category_id?: number;
  expense_type_id: number;
  company_id: number;
  name: string;
  amount: number;
  purchased_on: string;
  closing_date?: string | null;
  employee_id?: number | null;
  detail?: string | null;
}

export async function createExpenseItem(
  payload: ExpenseItemPayload
): Promise<{ data: ExpenseItem }> {
  return requestJson<{ data: ExpenseItem }>(
    '/v1/modules/cfo/expense-items',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create expense item'
  );
}

export async function updateExpenseItem(
  id: number,
  payload: ExpenseItemPayload
): Promise<{ data: ExpenseItem }> {
  return requestJson<{ data: ExpenseItem }>(
    `/v1/modules/cfo/expense-items/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update expense item'
  );
}

export async function deleteExpenseItem(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cfo/expense-items/${id}`,
    { method: 'DELETE' },
    'Failed to delete expense item'
  );
}

export async function fetchCompanyAssets(): Promise<CompanyAssetsListResponse> {
  return requestJson<CompanyAssetsListResponse>(
    '/v1/modules/cfo/company-assets',
    {},
    'Failed to fetch company assets'
  );
}

export interface CompanyAssetPayload {
  company_id: number;
  asset_date: string;
  name: string;
  amount: number;
  price_per_unit: number;
}

export async function createCompanyAsset(
  payload: CompanyAssetPayload
): Promise<{ data: CompanyAsset }> {
  return requestJson<{ data: CompanyAsset }>(
    '/v1/modules/cfo/company-assets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create company asset'
  );
}

export async function updateCompanyAsset(
  id: number,
  payload: CompanyAssetPayload
): Promise<{ data: CompanyAsset }> {
  return requestJson<{ data: CompanyAsset }>(
    `/v1/modules/cfo/company-assets/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update company asset'
  );
}

export async function deleteCompanyAsset(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cfo/company-assets/${id}`,
    { method: 'DELETE' },
    'Failed to delete company asset'
  );
}

export async function login(payload: {
  email: string;
  password: string;
  device_name?: string;
}): Promise<LoginResponse> {
  return requestJson<LoginResponse>(
    '/v1/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Login gagal'
  );
}

export async function logout(): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    '/v1/auth/logout',
    { method: 'POST' },
    'Logout gagal'
  );
}

export async function fetchCurrentUser(): Promise<{ data: AuthUser }> {
  return requestJson<{ data: AuthUser }>('/v1/auth/me', {}, 'Gagal memuat sesi');
}

export async function fetchActiveCompany(): Promise<{ data: Company | null }> {
  return requestJson<{ data: Company | null }>(
    '/v1/active-company',
    {},
    'Failed to fetch active company'
  );
}

export async function syncActiveCompany(
  companyId: number | null
): Promise<{ data: Company | null }> {
  return requestJson<{ data: Company | null }>(
    '/v1/active-company',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId }),
    },
    'Failed to update active company'
  );
}

export async function fetchChoEnums(): Promise<{ data: ChoEnums }> {
  return requestJson<{ data: ChoEnums }>(
    '/v1/modules/cho/enums',
    {},
    'Failed to fetch CHO enums'
  );
}

export async function fetchEmployeePositions(): Promise<EmployeePositionsListResponse> {
  return requestJson<EmployeePositionsListResponse>(
    '/v1/modules/cho/employee-positions',
    {},
    'Failed to fetch employee positions'
  );
}

export async function createEmployeePosition(
  payload: EmployeePositionPayload
): Promise<{ data: EmployeePosition }> {
  return requestJson<{ data: EmployeePosition }>(
    '/v1/modules/cho/employee-positions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create employee position'
  );
}

export async function updateEmployeePosition(
  id: number,
  payload: EmployeePositionPayload
): Promise<{ data: EmployeePosition }> {
  return requestJson<{ data: EmployeePosition }>(
    `/v1/modules/cho/employee-positions/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update employee position'
  );
}

export async function deleteEmployeePosition(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cho/employee-positions/${id}`,
    { method: 'DELETE' },
    'Failed to delete employee position'
  );
}

export async function fetchEmploymentStatuses(): Promise<EmploymentStatusesListResponse> {
  return requestJson<EmploymentStatusesListResponse>(
    '/v1/modules/cho/employment-statuses',
    {},
    'Failed to fetch employment statuses'
  );
}

export async function createEmploymentStatus(
  payload: EmploymentStatusPayload
): Promise<{ data: EmploymentStatus }> {
  return requestJson<{ data: EmploymentStatus }>(
    '/v1/modules/cho/employment-statuses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create employment status'
  );
}

export async function updateEmploymentStatus(
  id: number,
  payload: EmploymentStatusPayload
): Promise<{ data: EmploymentStatus }> {
  return requestJson<{ data: EmploymentStatus }>(
    `/v1/modules/cho/employment-statuses/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update employment status'
  );
}

export async function deleteEmploymentStatus(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cho/employment-statuses/${id}`,
    { method: 'DELETE' },
    'Failed to delete employment status'
  );
}

export async function fetchPayrollGrades(): Promise<PayrollGradesListResponse> {
  return requestJson<PayrollGradesListResponse>(
    '/v1/modules/cho/payroll-grades',
    {},
    'Failed to fetch payroll grades'
  );
}

export async function createPayrollGrade(
  payload: PayrollGradePayload
): Promise<{ data: PayrollGrade }> {
  return requestJson<{ data: PayrollGrade }>(
    '/v1/modules/cho/payroll-grades',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create payroll grade'
  );
}

export async function updatePayrollGrade(
  id: number,
  payload: PayrollGradePayload
): Promise<{ data: PayrollGrade }> {
  return requestJson<{ data: PayrollGrade }>(
    `/v1/modules/cho/payroll-grades/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update payroll grade'
  );
}

export async function deletePayrollGrade(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cho/payroll-grades/${id}`,
    { method: 'DELETE' },
    'Failed to delete payroll grade'
  );
}

export async function fetchTaxStatuses(): Promise<TaxStatusesListResponse> {
  return requestJson<TaxStatusesListResponse>(
    '/v1/modules/cho/tax-statuses',
    {},
    'Failed to fetch tax statuses'
  );
}

export async function createTaxStatus(
  payload: TaxStatusPayload
): Promise<{ data: TaxStatus }> {
  return requestJson<{ data: TaxStatus }>(
    '/v1/modules/cho/tax-statuses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create tax status'
  );
}

export async function updateTaxStatus(
  id: number,
  payload: TaxStatusPayload
): Promise<{ data: TaxStatus }> {
  return requestJson<{ data: TaxStatus }>(
    `/v1/modules/cho/tax-statuses/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update tax status'
  );
}

export async function deleteTaxStatus(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cho/tax-statuses/${id}`,
    { method: 'DELETE' },
    'Failed to delete tax status'
  );
}

export async function fetchEmployees(): Promise<EmployeesListResponse> {
  return requestJson<EmployeesListResponse>(
    '/v1/modules/cho/employees',
    {},
    'Failed to fetch employees'
  );
}

export async function fetchActiveCompanyEmployees(): Promise<EmployeesListResponse> {
  return requestJson<EmployeesListResponse>(
    '/v1/modules/cho/employees?active_company=1',
    {},
    'Failed to fetch active company employees'
  );
}

export async function createEmployee(
  payload: EmployeePayload
): Promise<{ data: Employee }> {
  return requestJson<{ data: Employee }>(
    '/v1/modules/cho/employees',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create employee'
  );
}

export async function updateEmployee(
  id: number,
  payload: EmployeePayload
): Promise<{ data: Employee }> {
  return requestJson<{ data: Employee }>(
    `/v1/modules/cho/employees/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update employee'
  );
}

export async function deleteEmployee(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cho/employees/${id}`,
    { method: 'DELETE' },
    'Failed to delete employee'
  );
}

export async function uploadEmployeeDocument(
  file: File,
  documentType?: string
): Promise<UploadedDocumentResponse> {
  const formData = new FormData();
  formData.append('document', file);
  if (documentType) {
    formData.append('document_type', documentType);
  }

  return requestJson<UploadedDocumentResponse>(
    '/v1/modules/cho/employees/upload-document',
    {
      method: 'POST',
      body: formData,
    },
    'Failed to upload employee document'
  );
}

export async function fetchEmployeeShifts(): Promise<EmployeeShiftsListResponse> {
  return requestJson<EmployeeShiftsListResponse>(
    '/v1/modules/hr/employee-shifts',
    {},
    'Failed to fetch employee shifts'
  );
}

export async function createEmployeeShift(
  payload: EmployeeShiftPayload
): Promise<{ data: EmployeeShift }> {
  return requestJson<{ data: EmployeeShift }>(
    '/v1/modules/hr/employee-shifts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create employee shift'
  );
}

export async function updateEmployeeShift(
  id: number,
  payload: EmployeeShiftPayload
): Promise<{ data: EmployeeShift }> {
  return requestJson<{ data: EmployeeShift }>(
    `/v1/modules/hr/employee-shifts/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update employee shift'
  );
}

export async function deleteEmployeeShift(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/hr/employee-shifts/${id}`,
    { method: 'DELETE' },
    'Failed to delete employee shift'
  );
}

export async function fetchEmployeeShiftAssignments(): Promise<EmployeeShiftAssignmentsListResponse> {
  return requestJson<EmployeeShiftAssignmentsListResponse>(
    '/v1/modules/hr/employee-shift-assignments',
    {},
    'Failed to fetch employee shift assignments'
  );
}

export async function createEmployeeShiftAssignment(
  payload: EmployeeShiftAssignmentPayload
): Promise<{ data: EmployeeShiftAssignment }> {
  return requestJson<{ data: EmployeeShiftAssignment }>(
    '/v1/modules/hr/employee-shift-assignments',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create employee shift assignment'
  );
}

export async function updateEmployeeShiftAssignment(
  id: number,
  payload: EmployeeShiftAssignmentPayload
): Promise<{ data: EmployeeShiftAssignment }> {
  return requestJson<{ data: EmployeeShiftAssignment }>(
    `/v1/modules/hr/employee-shift-assignments/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update employee shift assignment'
  );
}

export async function deleteEmployeeShiftAssignment(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/hr/employee-shift-assignments/${id}`,
    { method: 'DELETE' },
    'Failed to delete employee shift assignment'
  );
}

export async function fetchEmployeeAttendances(): Promise<EmployeeAttendancesListResponse> {
  return requestJson<EmployeeAttendancesListResponse>(
    '/v1/modules/hr/employee-attendances',
    {},
    'Failed to fetch employee attendances'
  );
}

export async function createEmployeeAttendance(
  payload: EmployeeAttendancePayload
): Promise<{ data: EmployeeAttendance }> {
  return requestJson<{ data: EmployeeAttendance }>(
    '/v1/modules/hr/employee-attendances',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create employee attendance'
  );
}

export async function updateEmployeeAttendance(
  id: number,
  payload: EmployeeAttendancePayload
): Promise<{ data: EmployeeAttendance }> {
  return requestJson<{ data: EmployeeAttendance }>(
    `/v1/modules/hr/employee-attendances/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update employee attendance'
  );
}

export async function deleteEmployeeAttendance(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/hr/employee-attendances/${id}`,
    { method: 'DELETE' },
    'Failed to delete employee attendance'
  );
}

export async function fetchPayrollWorkspace(
  companyId: number,
  period: string
): Promise<{ data: PayrollWorkspaceData }> {
  const params = new URLSearchParams({
    company_id: String(companyId),
    period,
  });
  return requestJson<{ data: PayrollWorkspaceData }>(
    `/v1/modules/cho/payroll/workspace?${params.toString()}`,
    {},
    'Failed to fetch payroll workspace'
  );
}

export async function saveEmployeePayrollRow(
  payload: SaveEmployeePayrollPayload
): Promise<{ data: PayrollItem }> {
  return requestJson<{ data: PayrollItem }>(
    '/v1/modules/cho/payroll/save-row',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to save payroll row'
  );
}

export async function finalizeEmployeePayrollRow(
  payload: SaveEmployeePayrollPayload
): Promise<{ data: PayrollItem }> {
  return requestJson<{ data: PayrollItem }>(
    '/v1/modules/cho/payroll/finalize-row',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to finalize payroll row'
  );
}
