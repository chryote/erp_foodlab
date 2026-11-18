import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_HEADERS } from './config.js';
import { assertHealthOk, assertSamplesListOk } from './helpers/assertions.js';

export const options = {
  vus: 1,
  duration: '15s',
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<250'],
  },
};

export default function () {
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    headers: DEFAULT_HEADERS,
  });
  assertHealthOk(healthRes);

  const samplesRes = http.get(`${BASE_URL}/api/v1/samples`, {
    headers: DEFAULT_HEADERS,
  });
  assertSamplesListOk(samplesRes);

  const metricsRes = http.get(`${BASE_URL}/api/metrics`);
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics contains prometheus counter': (r) =>
      r.body && r.body.includes('erp_foodlab_http_requests_total'),
  });

  sleep(1);
}
