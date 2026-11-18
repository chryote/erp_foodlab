# erp_foodlab

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Laravel 11](https://img.shields.io/badge/Laravel-11.x-FF2D20.svg?style=flat-square&logo=laravel)](https://laravel.com)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB.svg?style=flat-square&logo=react)](https://react.dev)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat-square&logo=docker)](https://docs.docker.com/compose/)
[![Redis 7](https://img.shields.io/badge/Redis-7.4-DC382D.svg?style=flat-square&logo=redis)](https://redis.io)
[![k6](https://img.shields.io/badge/k6-Benchmark-7D64FF.svg?style=flat-square&logo=k6)](https://k6.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-E6522C.svg?style=flat-square&logo=prometheus)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboards-F46800.svg?style=flat-square&logo=grafana)](https://grafana.com)

> Monorepo scaffolder with Laravel, React.js, Docker, MySQL, Redis, Pest/Vitest, k6, and Prometheus + Grafana.

`erp_foodlab` is a production-ready full-stack monorepo starter template designed for Food Laboratory Quality Control & ERP systems. It separates the **Laravel 11 REST API** (`backend/`) and the **React + Vite + TypeScript SPA** (`frontend/`), orchestrates all backing services via **Docker Compose** (**MySQL 8.0**, **Redis 7.4**, **Nginx**), includes comprehensive unit and feature test suites (**Pest PHP** + **Vitest & React Testing Library**), provides automated load/stress benchmarking via **Grafana k6**, and ships with pre-provisioned **Prometheus + Grafana** observability dashboards.

## Table of Contents

- [Security](#security)
- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Security

Never commit production secrets, `.env` files, or private API keys to version control. Default credentials in `.env.example` and `docker-compose.yml` are strictly for local containerized development. For production deployments:

- Generate a strong `APP_KEY` via `php artisan key:generate`.
- Configure non-default passwords for `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `REDIS_PASSWORD`, and `GRAFANA_ADMIN_PASSWORD`.
- Restrict public network access to `/api/metrics`, Prometheus (`:9090`), and Redis (`:6379`) behind an internal VPC or ingress firewall.

## Background

Modern laboratory and ERP workflows require low-latency reads, strict data integrity, automated testing, repeatable load verification, and real-time telemetry from day one. This repository scaffolds a complete architecture out of the box:

```text
erp_foodlab/
├── backend/                  # Laravel 11 API, MySQL models, Redis cache-aside, Pest PHP tests
│   └── app/Modules/          # Modular backend architecture (CFO, CHO, CPO, CDO, CMO)
├── frontend/                 # React 18 + Vite + TypeScript SPA, Vitest + Testing Library
│   └── src/modules/          # Modular frontend cards & views (CFO, CHO, CPO, CDO, CMO)
├── benchmarks/k6/            # Grafana k6 smoke, load, and stress benchmark scripts
├── docker/                   # Nginx, PHP-FPM 8.4, MySQL 8.0 init, and Redis 7.4 configs
├── monitoring/               # Prometheus scrape/alert rules & provisioned Grafana dashboards
├── docker-compose.yml        # Full-stack multi-container orchestration
└── Makefile                  # Developer workflow shortcuts
```

Key architectural highlights:

- **Backend (`backend/`)**: Laravel 11 with PHP 8.4, `LabSampleService` implementing a Redis cache-aside pattern (`erp_foodlab:samples:list`), and `RecordPrometheusMetrics` middleware exposing `/api/metrics`.
- **Frontend (`frontend/`)**: React 18 + TypeScript + Vite dashboard displaying live MySQL/Redis infrastructure status and filterable FoodLab quality control samples.
- **Caching & Queues**: Redis 7.4 (`allkeys-lru`) paired with `oliver006/redis_exporter` for real-time memory and client telemetry.
- **Unit & Feature Testing**: Pest PHP v3 (`tests/Unit` and `tests/Feature`) for the backend and Vitest + React Testing Library (`src/test/`) for the frontend.
- **Load Benchmarking (`benchmarks/k6/`)**: Modular k6 scripts (`smoke.test.js`, `load.test.js`, `stress.test.js`) with p95/p99 SLA thresholds.
- **Observability (`monitoring/`)**: Prometheus scrapes `/api/metrics` and `redis-exporter`, feeding a pre-built **ERP FoodLab - API & Redis Overview** Grafana dashboard.

## Install

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose v2+)
- *(Optional for local non-Docker execution)*: PHP 8.2+, Composer 2.x, Node.js 20+, and npm 10+

### Quick Start with Docker Compose

1. Clone or initialize the repository and copy the environment configuration files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Build and start all containers in detached mode:

```bash
docker compose up -d --build
```

3. Generate the Laravel application key and run database migrations & seeders:

```bash
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

### Service Endpoints

| Service | URL | Credentials / Notes |
| :--- | :--- | :--- |
| **React Frontend SPA** | `http://localhost:5173` | Vite HMR Development Server |
| **Laravel API (Nginx)** | `http://localhost:8000/api/health` | REST API & Health Check |
| **Prometheus Metrics** | `http://localhost:8000/api/metrics` | OpenMetrics / Prometheus text format |
| **Prometheus UI** | `http://localhost:9090` | Targets, PromQL & Alert Rules |
| **Grafana UI** | `http://localhost:3000` | Default login: `admin` / `admin` |
| **MySQL 8.0** | `localhost:3306` | DB: `erp_foodlab` (`foodlab` / `secret`) |
| **Redis 7.4** | `localhost:6379` | Cache, Session & Queue store |

## Usage

### Running Unit & Feature Tests

Run **Backend (Pest PHP)** tests inside Docker or locally:

```bash
# Via Docker Compose
docker compose exec app ./vendor/bin/pest

# Or locally inside /backend
cd backend && composer install && ./vendor/bin/pest
```

Run **Frontend (Vitest + React Testing Library)** tests inside Docker or locally:

```bash
# Via Docker Compose
docker compose exec frontend npm run test:run

# Or locally inside /frontend
cd frontend && npm install && npm run test:run
```

### Running k6 Benchmarks

The `k6` container is configured under the `benchmark` Docker Compose profile so it runs on demand against the internal `nginx` service:

```bash
# 1. Smoke Test (1 VU for 15s, 0% errors expected)
docker compose --profile benchmark run --rm k6 run /scripts/smoke.test.js

# 2. Load Test (Ramps up to 50 VUs over 3m, asserts p95 < 300ms)
docker compose --profile benchmark run --rm k6 run /scripts/load.test.js

# 3. Stress Test (Ramps up to 150 VUs over 3m to test Redis & PHP-FPM saturation)
docker compose --profile benchmark run --rm k6 run /scripts/stress.test.js
```

### Inspecting Prometheus & Grafana Dashboards

1. Open Grafana at `http://localhost:3000` and sign in with `admin` / `admin`.
2. Navigate to **Dashboards -> ERP FoodLab -> ERP FoodLab - API & Redis Overview**.
3. Run a k6 load test (`npm run k6:load`) to watch live request rates (`erp_foodlab_http_requests_total`), average route latency, Redis memory consumption (`redis_memory_used_bytes`), and sample status breakdown (`erp_foodlab_samples_total`).

## API

### `GET /api/health`

Verifies connectivity to MySQL and Redis.

```json
{
  "status": "ok",
  "service": "ERP FoodLab API",
  "checks": {
    "database": "ok",
    "cache_redis": "ok"
  },
  "timestamp": "2026-11-18T09:40:00+00:00"
}
```

### `GET /api/v1/modules`

Returns the ERP Main Menu summary across all 5 executive modules (`CFO`, `CHO`, `CPO`, `CDO`, `CMO`), with individual module endpoints also available at:

- `GET /api/v1/modules/cfo` — **CFO (Keuangan)**
- `GET /api/v1/modules/cho` — **CHO (SDM)**
- `GET /api/v1/modules/cpo` — **CPO (Persediaan Barang Dagang)**
- `GET /api/v1/modules/cdo` — **CDO (Pemasaran)**
- `GET /api/v1/modules/cmo` — **CMO (Penjualan)**

### `GET /api/v1/samples`

Returns the 50 most recent FoodLab quality control samples, cached in Redis under key `erp_foodlab:samples:list`.

### `POST /api/v1/samples`

Creates a new laboratory sample, computes its physicochemical quality grade (`PASS`, `REVIEW`, or `REJECT`), and invalidates the Redis sample list cache.

Request body:

```json
{
  "batch_code": "FL-MILK-2026",
  "product_name": "Pasteurized Whole Milk 1L",
  "category": "Dairy",
  "ph_level": 6.65,
  "moisture_percent": 87.5,
  "status": "pending"
}
```

### `GET /api/metrics`

Exposes application counters and gauges in Prometheus `0.0.4` text format:

- `erp_foodlab_http_requests_total{method,route,status}`
- `erp_foodlab_http_request_duration_seconds_sum{method,route}`
- `erp_foodlab_http_request_duration_seconds_count{method,route}`
- `erp_foodlab_samples_total{status}`

## Maintainers

- [@erp-foodlab-team](https://github.com/erp-foodlab)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing requirements, and pull request guidelines. Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT](LICENSE) © 2026 ERP FoodLab Contributors
