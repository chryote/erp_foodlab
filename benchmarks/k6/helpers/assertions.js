import { check } from 'k6';

export function assertHealthOk(res) {
  return check(res, {
    'health status is 200': (r) => r.status === 200,
    'health payload reports ok': (r) => {
      try {
        const body = r.json();
        return body.status === 'ok';
      } catch (_) {
        return false;
      }
    },
  });
}

export function assertSamplesListOk(res) {
  return check(res, {
    'samples status is 200': (r) => r.status === 200,
    'samples payload has data array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.data);
      } catch (_) {
        return false;
      }
    },
  });
}
