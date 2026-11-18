export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8000';

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export const SLA_THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // Error rate must be < 1%
  http_req_duration: ['p(95)<300', 'p(99)<600'], // 95% of requests < 300ms
};
