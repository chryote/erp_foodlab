export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  checks: {
    database: 'ok' | 'error';
    cache_redis: 'ok' | 'error';
  };
  timestamp: string;
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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {},
  errorPrefix = 'Request failed'
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Tidak dapat terhubung ke server API (${API_BASE_URL}${endpoint}): ${detail}`
    );
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
  payload: { name: string }
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

