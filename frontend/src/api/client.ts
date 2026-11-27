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

export type CompanyType =
  | 'Utama'
  | 'Packing'
  | 'Kelengkapan'
  | 'Sarpras'
  | 'Bahan'
  | (string & {});

export interface CfoEnums {
  company_type: EnumOption[];
}

export interface Company {
  id: number;
  name: string;
  series?: number;
  type?: CompanyType;
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

export type ItemType = 'Bahan' | 'Kelengkapan' | 'Sarpras' | (string & {});

export type PacketVendorType =
  | 'Bahan'
  | 'Kelengkapan'
  | 'Sarpras'
  | (string & {});

export interface CpoEnums {
  item_type: EnumOption[];
  packet_vendor_type?: EnumOption[];
}

export interface Item {
  id: number;
  company_id: number | null;
  packet_vendor_id?: number | null;
  code?: string | null;
  name: string;
  type: ItemType;
  company?: Company | null;
  packet_vendor?: PacketVendor | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ItemPayload {
  company_id?: number | null;
  packet_vendor_id?: number | null;
  code?: string | null;
  name: string;
  type: ItemType;
}

export interface ItemsListResponse {
  data: Item[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface Packet {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PacketPayload {
  name: string;
}

export interface PacketsListResponse {
  data: Packet[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface ItemPacket {
  id: number;
  company_id: number | null;
  packet_vendor_id?: number | null;
  packet_id: number;
  item_id: number;
  quantity: number;
  company?: Company | null;
  packet_vendor?: PacketVendor | null;
  packet?: Packet | null;
  item?: Item | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface ItemPacketPayload {
  company_id?: number | null;
  packet_vendor_id?: number | null;
  packet_id: number;
  item_id: number;
  quantity: number;
}

export interface ItemPacketsListResponse {
  data: ItemPacket[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface PacketName {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PacketNamePayload {
  name: string;
}

export interface PacketNamesListResponse {
  data: PacketName[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface PacketVendor {
  id: number;
  name: string;
  type?: PacketVendorType;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PacketVendorPayload {
  name: string;
  type?: PacketVendorType;
}

export interface PacketVendorsListResponse {
  data: PacketVendor[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface PacketCategory {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PacketCategoryPayload {
  name: string;
}

export interface PacketCategoriesListResponse {
  data: PacketCategory[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface DefaultPackage {
  id: number;
  brand_name: string;
  packet_name_id: number;
  company_id?: number | null;
  packet_vendor_id?: number | null;
  packet_category_id: number;
  packet_id?: number | null;
  item_packet_id?: number | null;
  price: number;
  packet_name?: PacketName | null;
  company?: Company | null;
  packet_vendor?: PacketVendor | null;
  packet_category?: PacketCategory | null;
  packet?: Packet | null;
  item_packet?: ItemPacket | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DefaultPackagePayload {
  brand_name: string;
  packet_name_id: number;
  company_id?: number | null;
  packet_vendor_id?: number | null;
  packet_category_id: number;
  packet_id?: number | null;
  item_packet_id?: number | null;
  price?: number;
}

export interface DefaultPackageWizardItemPayload {
  item_id: number;
  quantity: number;
  price?: number;
}

export interface DefaultPackageWizardPayload {
  packet_name: string;
  packet_category: string;
  brand_name: string;
  company_id?: number | null;
  packet_vendor_id?: number | null;
  price: number;
  items: DefaultPackageWizardItemPayload[];
}

export interface DefaultPackagesListResponse {
  data: DefaultPackage[];
  meta: {
    count: number;
    total?: number;
    page?: number;
    per_page?: number;
    last_page?: number;
    cache_key?: string;
  };
}

export interface Ingredient {
  id: number;
  default_package_id: number;
  item_id: number;
  price: number;
  default_package?: DefaultPackage | null;
  item?: Item | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface IngredientPayload {
  default_package_id: number;
  item_id: number;
  price?: number;
}

export interface IngredientsListResponse {
  data: Ingredient[];
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

export async function fetchCfoEnums(): Promise<{ data: CfoEnums }> {
  return requestJson<{ data: CfoEnums }>(
    '/v1/modules/cfo/enums',
    {},
    'Failed to fetch CFO enums'
  );
}

interface ListRequestParams {
  page: number;
  per_page: number;
  search?: string;
  sort?: string;
  company_id?: number;
  series?: number;
  expense_category_id?: number;
  expense_type_id?: number;
}


function buildListQuery(params?: ListRequestParams): string {
  if (!params) {
    return '';
  }

  const query = new URLSearchParams({
    page: String(params.page),
    per_page: String(params.per_page),
  });
  if (params.search?.trim()) {
    query.set('filter[search]', params.search.trim());
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }
  if (params.series !== undefined) {
    query.set('filter[series]', String(params.series));
  }
  if (params.company_id !== undefined) {
    query.set('filter[company_id]', String(params.company_id));
  }
  if (params.expense_category_id !== undefined) {
    query.set(
      'filter[expense_category_id]',
      String(params.expense_category_id)
    );
  }
  if (params.expense_type_id !== undefined) {
    query.set('filter[expense_type_id]', String(params.expense_type_id));
  }

  return `?${query.toString()}`;
}

export async function fetchCompanies(
  params?: ListRequestParams
): Promise<CompaniesListResponse> {
  return requestJson<CompaniesListResponse>(
    `/v1/modules/cfo/companies${buildListQuery(params)}`,
    {},
    'Failed to fetch companies'
  );
}

export async function createCompany(payload: {
  name: string;
  series?: number;
  type?: CompanyType;
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
  payload: { name: string; series?: number; type?: CompanyType }
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

export async function fetchCapitalCompanies(
  params?: ListRequestParams
): Promise<CapitalCompaniesListResponse> {
  return requestJson<CapitalCompaniesListResponse>(
    `/v1/modules/cfo/capital-companies${buildListQuery(params)}`,
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

export async function fetchExpenseCategories(
  params?: ListRequestParams
): Promise<ExpenseCategoriesListResponse> {
  return requestJson<ExpenseCategoriesListResponse>(
    `/v1/modules/cfo/expense-categories${buildListQuery(params)}`,
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

export async function fetchExpenseTypes(
  params?: ListRequestParams
): Promise<ExpenseTypesListResponse> {
  return requestJson<ExpenseTypesListResponse>(
    `/v1/modules/cfo/expense-types${buildListQuery(params)}`,
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

export async function fetchExpenseItems(
  params?: ListRequestParams
): Promise<ExpenseItemsListResponse> {
  return requestJson<ExpenseItemsListResponse>(
    `/v1/modules/cfo/expense-items${buildListQuery(params)}`,
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

export async function fetchCompanyAssets(
  params?: ListRequestParams
): Promise<CompanyAssetsListResponse> {
  return requestJson<CompanyAssetsListResponse>(
    `/v1/modules/cfo/company-assets${buildListQuery(params)}`,
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

export async function fetchEmployeePositions(
  params?: ListRequestParams
): Promise<EmployeePositionsListResponse> {
  return requestJson<EmployeePositionsListResponse>(
    `/v1/modules/cho/employee-positions${buildListQuery(params)}`,
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

export async function fetchEmploymentStatuses(
  params?: ListRequestParams
): Promise<EmploymentStatusesListResponse> {
  return requestJson<EmploymentStatusesListResponse>(
    `/v1/modules/cho/employment-statuses${buildListQuery(params)}`,
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

export async function fetchPayrollGrades(
  params?: ListRequestParams
): Promise<PayrollGradesListResponse> {
  return requestJson<PayrollGradesListResponse>(
    `/v1/modules/cho/payroll-grades${buildListQuery(params)}`,
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

export async function fetchTaxStatuses(
  params?: ListRequestParams
): Promise<TaxStatusesListResponse> {
  return requestJson<TaxStatusesListResponse>(
    `/v1/modules/cho/tax-statuses${buildListQuery(params)}`,
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

export async function fetchEmployees(
  params?: ListRequestParams
): Promise<EmployeesListResponse> {
  return requestJson<EmployeesListResponse>(
    `/v1/modules/cho/employees${buildListQuery(params)}`,
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

export async function fetchEmployeeShifts(
  params?: ListRequestParams
): Promise<EmployeeShiftsListResponse> {
  return requestJson<EmployeeShiftsListResponse>(
    `/v1/modules/hr/employee-shifts${buildListQuery(params)}`,
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

export async function fetchEmployeeShiftAssignments(
  params?: ListRequestParams
): Promise<EmployeeShiftAssignmentsListResponse> {
  return requestJson<EmployeeShiftAssignmentsListResponse>(
    `/v1/modules/hr/employee-shift-assignments${buildListQuery(params)}`,
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

export async function fetchEmployeeAttendances(
  params?: ListRequestParams
): Promise<EmployeeAttendancesListResponse> {
  return requestJson<EmployeeAttendancesListResponse>(
    `/v1/modules/hr/employee-attendances${buildListQuery(params)}`,
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

export async function fetchCpoEnums(): Promise<{ data: CpoEnums }> {
  return requestJson<{ data: CpoEnums }>(
    '/v1/modules/cpo/enums',
    {},
    'Failed to fetch CPO enums'
  );
}

export async function fetchItems(
  params?: ListRequestParams
): Promise<ItemsListResponse> {
  return requestJson<ItemsListResponse>(
    `/v1/modules/cpo/items${buildListQuery(params)}`,
    {},
    'Failed to fetch items'
  );
}

export async function createItem(
  payload: ItemPayload
): Promise<{ data: Item }> {
  return requestJson<{ data: Item }>(
    '/v1/modules/cpo/items',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create item'
  );
}

export async function updateItem(
  id: number,
  payload: ItemPayload
): Promise<{ data: Item }> {
  return requestJson<{ data: Item }>(
    `/v1/modules/cpo/items/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update item'
  );
}

export async function deleteItem(id: number): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cpo/items/${id}`,
    { method: 'DELETE' },
    'Failed to delete item'
  );
}

export async function fetchPackets(
  params?: ListRequestParams
): Promise<PacketsListResponse> {
  return requestJson<PacketsListResponse>(
    `/v1/modules/cpo/packets${buildListQuery(params)}`,
    {},
    'Failed to fetch packets'
  );
}

export async function createPacket(
  payload: PacketPayload
): Promise<{ data: Packet }> {
  return requestJson<{ data: Packet }>(
    '/v1/modules/cpo/packets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create packet'
  );
}

export async function updatePacket(
  id: number,
  payload: PacketPayload
): Promise<{ data: Packet }> {
  return requestJson<{ data: Packet }>(
    `/v1/modules/cpo/packets/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update packet'
  );
}

export async function deletePacket(id: number): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cpo/packets/${id}`,
    { method: 'DELETE' },
    'Failed to delete packet'
  );
}

export async function fetchItemPackets(
  params?: ListRequestParams
): Promise<ItemPacketsListResponse> {
  return requestJson<ItemPacketsListResponse>(
    `/v1/modules/cpo/item-packets${buildListQuery(params)}`,
    {},
    'Failed to fetch item packets'
  );
}

export async function createItemPacket(
  payload: ItemPacketPayload
): Promise<{ data: ItemPacket }> {
  return requestJson<{ data: ItemPacket }>(
    '/v1/modules/cpo/item-packets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create item packet'
  );
}

export async function updateItemPacket(
  id: number,
  payload: ItemPacketPayload
): Promise<{ data: ItemPacket }> {
  return requestJson<{ data: ItemPacket }>(
    `/v1/modules/cpo/item-packets/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update item packet'
  );
}

export async function deleteItemPacket(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cpo/item-packets/${id}`,
    { method: 'DELETE' },
    'Failed to delete item packet'
  );
}

export async function fetchPacketNames(): Promise<PacketNamesListResponse> {
  return requestJson<PacketNamesListResponse>(
    '/v1/modules/cpo/packet-names',
    {},
    'Failed to fetch packet names'
  );
}

export async function createPacketName(
  payload: PacketNamePayload
): Promise<{ data: PacketName }> {
  return requestJson<{ data: PacketName }>(
    '/v1/modules/cpo/packet-names',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create packet name'
  );
}

export async function updatePacketName(
  id: number,
  payload: PacketNamePayload
): Promise<{ data: PacketName }> {
  return requestJson<{ data: PacketName }>(
    `/v1/modules/cpo/packet-names/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update packet name'
  );
}

export async function deletePacketName(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cpo/packet-names/${id}`,
    { method: 'DELETE' },
    'Failed to delete packet name'
  );
}

export async function fetchPacketVendors(): Promise<PacketVendorsListResponse> {
  return requestJson<PacketVendorsListResponse>(
    '/v1/modules/cpo/packet-vendors',
    {},
    'Failed to fetch packet vendors'
  );
}

export async function createPacketVendor(
  payload: PacketVendorPayload
): Promise<{ data: PacketVendor }> {
  return requestJson<{ data: PacketVendor }>(
    '/v1/modules/cpo/packet-vendors',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create packet vendor'
  );
}

export async function updatePacketVendor(
  id: number,
  payload: PacketVendorPayload
): Promise<{ data: PacketVendor }> {
  return requestJson<{ data: PacketVendor }>(
    `/v1/modules/cpo/packet-vendors/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update packet vendor'
  );
}

export async function deletePacketVendor(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cpo/packet-vendors/${id}`,
    { method: 'DELETE' },
    'Failed to delete packet vendor'
  );
}

export async function fetchPacketCategories(): Promise<PacketCategoriesListResponse> {
  return requestJson<PacketCategoriesListResponse>(
    '/v1/modules/cpo/packet-categories',
    {},
    'Failed to fetch packet categories'
  );
}

export async function createPacketCategory(
  payload: PacketCategoryPayload
): Promise<{ data: PacketCategory }> {
  return requestJson<{ data: PacketCategory }>(
    '/v1/modules/cpo/packet-categories',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create packet category'
  );
}

export async function updatePacketCategory(
  id: number,
  payload: PacketCategoryPayload
): Promise<{ data: PacketCategory }> {
  return requestJson<{ data: PacketCategory }>(
    `/v1/modules/cpo/packet-categories/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update packet category'
  );
}

export async function deletePacketCategory(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cpo/packet-categories/${id}`,
    { method: 'DELETE' },
    'Failed to delete packet category'
  );
}

export async function fetchDefaultPackages(): Promise<DefaultPackagesListResponse> {
  return requestJson<DefaultPackagesListResponse>(
    '/v1/modules/cpo/default-packages',
    {},
    'Failed to fetch default packages'
  );
}

export async function createDefaultPackage(
  payload: DefaultPackagePayload
): Promise<{ data: DefaultPackage }> {
  return requestJson<{ data: DefaultPackage }>(
    '/v1/modules/cpo/default-packages',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create default package'
  );
}

export async function createDefaultPackageWizard(
  payload: DefaultPackageWizardPayload
): Promise<{ data: DefaultPackage }> {
  return requestJson<{ data: DefaultPackage }>(
    '/v1/modules/cpo/default-packages/wizard',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to save default package wizard'
  );
}

export async function updateDefaultPackageWizard(
  id: number,
  payload: DefaultPackageWizardPayload
): Promise<{ data: DefaultPackage }> {
  return requestJson<{ data: DefaultPackage }>(
    `/v1/modules/cpo/default-packages/${id}/wizard`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update default package wizard'
  );
}

export async function updateDefaultPackage(
  id: number,
  payload: DefaultPackagePayload
): Promise<{ data: DefaultPackage }> {
  return requestJson<{ data: DefaultPackage }>(
    `/v1/modules/cpo/default-packages/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update default package'
  );
}

export async function deleteDefaultPackage(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cpo/default-packages/${id}`,
    { method: 'DELETE' },
    'Failed to delete default package'
  );
}

export async function fetchIngredients(): Promise<IngredientsListResponse> {
  return requestJson<IngredientsListResponse>(
    '/v1/modules/cpo/ingredients',
    {},
    'Failed to fetch ingredients'
  );
}

export async function createIngredient(
  payload: IngredientPayload
): Promise<{ data: Ingredient }> {
  return requestJson<{ data: Ingredient }>(
    '/v1/modules/cpo/ingredients',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to create ingredient'
  );
}

export async function updateIngredient(
  id: number,
  payload: IngredientPayload
): Promise<{ data: Ingredient }> {
  return requestJson<{ data: Ingredient }>(
    `/v1/modules/cpo/ingredients/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update ingredient'
  );
}

export async function deleteIngredient(
  id: number
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(
    `/v1/modules/cpo/ingredients/${id}`,
    { method: 'DELETE' },
    'Failed to delete ingredient'
  );
}
