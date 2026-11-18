declare const __ENV: Record<string, string | undefined>;
declare const __VU: number;
declare const __ITER: number;

declare module 'k6' {
  export function check<T>(
    val: T,
    sets: Record<string, (v: T) => boolean>
  ): boolean;
  export function group<T>(name: string, fn: () => T): T;
  export function sleep(t: number): void;
}

declare module 'k6/http' {
  export interface Response {
    status: number;
    body: string;
    timings: {
      duration: number;
    };
    json: <T = any>() => T;
  }

  export interface Params {
    headers?: Record<string, string>;
  }

  const http: {
    get(url: string, params?: Params): Response;
    post(url: string, body?: string | null, params?: Params): Response;
    batch(
      requests: Array<[string, string, string | null, Params?]>
    ): Response[];
  };

  export default http;
}

declare module 'k6/metrics' {
  export class Rate {
    constructor(name: string);
    add(value: boolean | number): void;
  }
  export class Trend {
    constructor(name: string);
    add(value: number): void;
  }
}
