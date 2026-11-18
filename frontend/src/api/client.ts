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

export async function fetchLabSamples(): Promise<SamplesListResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/samples`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch samples: ${response.status}`);
  }
  return response.json();
}
