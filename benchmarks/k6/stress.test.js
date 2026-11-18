import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, DEFAULT_HEADERS } from './config.js';
import { assertHealthOk, assertSamplesListOk } from './helpers/assertions.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 150 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Allow up to 5% under extreme stress
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/health`, null, { headers: DEFAULT_HEADERS }],
    ['GET', `${BASE_URL}/api/v1/samples`, null, { headers: DEFAULT_HEADERS }],
  ]);

  assertHealthOk(responses[0]);
  assertSamplesListOk(responses[1]);

  sleep(0.5);
}
