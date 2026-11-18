import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, DEFAULT_HEADERS, SLA_THRESHOLDS } from './config.js';
import { assertHealthOk, assertSamplesListOk } from './helpers/assertions.js';

const sampleCreationErrors = new Rate('sample_creation_errors');
const cachedListLatency = new Trend('cached_list_latency_ms');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 VUs
    { duration: '1m', target: 50 },  // Ramp up to 50 VUs
    { duration: '1m', target: 50 },  // Stay at 50 VUs
    { duration: '30s', target: 0 },  // Ramp down to 0
  ],
  thresholds: {
    ...SLA_THRESHOLDS,
    sample_creation_errors: ['rate<0.01'],
    cached_list_latency_ms: ['p(95)<200'],
  },
};

export default function () {
  group('01_Health_And_Cache_Read', () => {
    const healthRes = http.get(`${BASE_URL}/api/health`, {
      headers: DEFAULT_HEADERS,
    });
    assertHealthOk(healthRes);

    const listRes = http.get(`${BASE_URL}/api/v1/samples`, {
      headers: DEFAULT_HEADERS,
    });
    cachedListLatency.add(listRes.timings.duration);
    assertSamplesListOk(listRes);
  });

  group('02_Create_FoodLab_Sample', () => {
    const uniqueBatch = `BATCH-${__VU}-${__ITER}-${Date.now()}`;
    const payload = JSON.stringify({
      batch_code: uniqueBatch,
      product_name: 'Pasteurized Whole Milk 1L',
      category: 'Dairy',
      ph_level: 6.65,
      moisture_percent: 87.5,
      status: 'pending',
    });

    const createRes = http.post(`${BASE_URL}/api/v1/samples`, payload, {
      headers: DEFAULT_HEADERS,
    });

    const ok = check(createRes, {
      'create sample returns 201': (r) => r.status === 201,
    });
    sampleCreationErrors.add(!ok);
  });

  sleep(1);
}
