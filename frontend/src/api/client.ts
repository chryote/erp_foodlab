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

async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {},
  errorPrefix = 'Request failed'
): Promise<T> {
  let response: Response;
  try {
    const token = getAuthToken();
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    try {
      const errBody = (await response.json()) as { message?: string };
      if (errBody?.message) {
        serverMessage = ` - ${errBody.message.split('\n')[0]}`;
      }
    } catch {
      // Ignore non-JSON error bodies
    }
    throw new Error(`${errorPrefix}: ${response.status}${serverMessage}`);
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
