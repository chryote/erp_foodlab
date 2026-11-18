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
  stakeholder_name: string;
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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export async function fetchHealthStatus(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchErpModules(): Promise<ErpModulesListResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/modules`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ERP modules: ${response.status}`);
  }
  return response.json();
}

export async function fetchLabSamples(): Promise<SamplesListResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/samples`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch samples: ${response.status}`);
  }
  return response.json();
}

export async function fetchCompanies(): Promise<CompaniesListResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/modules/cfo/companies`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch companies: ${response.status}`);
  }
  return response.json();
}

export async function createCompany(payload: {
  name: string;
  stakeholder_name: string;
}): Promise<{ data: Company }> {
  const response = await fetch(`${API_BASE_URL}/v1/modules/cfo/companies`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create company: ${response.status}`);
  }
  return response.json();
}

export async function updateCompany(
  id: number,
  payload: { name: string; stakeholder_name: string }
): Promise<{ data: Company }> {
  const response = await fetch(
    `${API_BASE_URL}/v1/modules/cfo/companies/${id}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to update company: ${response.status}`);
  }
  return response.json();
}

export async function deleteCompany(
  id: number
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/v1/modules/cfo/companies/${id}`,
    {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to delete company: ${response.status}`);
  }
  return response.json();

}
