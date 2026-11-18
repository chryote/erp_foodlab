# erp_foodlab

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Laravel 11](https://img.shields.io/badge/Laravel-11.x-FF2D20.svg?style=flat-square&logo=laravel)](https://laravel.com)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB.svg?style=flat-square&logo=react)](https://react.dev)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat-square&logo=docker)](https://docs.docker.com/compose/)
[![MySQL 8.0](https://img.shields.io/badge/MySQL-8.0-4479A1.svg?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com)
[![Redis 7](https://img.shields.io/badge/Redis-7.4-DC382D.svg?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![k6](https://img.shields.io/badge/k6-Benchmark-7D64FF.svg?style=flat-square&logo=k6)](https://k6.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-E6522C.svg?style=flat-square&logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboards-F46800.svg?style=flat-square&logo=grafana&logoColor=white)](https://grafana.com)

> Monorepo scaffolder with Laravel, React.js, Docker, MySQL, Redis, Pest/Vitest, k6, and Prometheus + Grafana.

`erp_foodlab` (**PT. Slaras Nusa Foodlab**) is a modular full-stack ERP monorepo starter template built with a **Laravel 11 REST API** (`backend/`) and a **React 18 + Vite + TypeScript SPA** (`frontend/`). It features a modular domain architecture for five executive ERP modules (**CFO**, **CHO**, **CPO**, **CDO**, **CMO**), a reusable UI component library (`frontend/src/components/ui/`), containerized backing services via **Docker Compose** (**MySQL 8.0**, **Redis 7.4**, **Nginx**), automated unit and feature test suites (**Pest PHP** + **Vitest & React Testing Library**), load/stress benchmarking via **Grafana k6**, and pre-provisioned **Prometheus + Grafana** observability dashboards.

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

Modern laboratory and enterprise resource planning systems require clear modular boundaries, reusable UI primitives, low-latency Redis caching, automated testing, repeatable load verification, and real-time telemetry from day one.

### Repository Structure

```text
erp_foodlab/
├── backend/                          # Laravel 11 API (PHP 8.4), MySQL, Redis, Prometheus, Pest PHP
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/          # ErpMenuController, HealthController, LabSampleController, MetricsController
│   │   │   └── Middleware/           # RecordPrometheusMetrics
│   │   ├── Modules/                  # Dedicated Backend Folders per Executive Module
│   │   │   ├── CFO/                  # CFO (Keuangan) — Controllers, Services, routes.php
│   │   │   ├── CHO/                  # CHO (SDM) — Controllers, Services, routes.php
│   │   │   ├── CPO/                  # CPO (Persediaan Barang Dagang) — Controllers, Services, routes.php
│   │   │   ├── CDO/                  # CDO (Pemasaran) — Controllers, Services, routes.php
│   │   │   └── CMO/                  # CMO (Penjualan) — Controllers, Services, routes.php
│   │   └── Services/                 # LabSampleService, MetricsCollectorService
│   └── tests/                        # Pest PHP Unit & Feature test suites (16 tests, 73 assertions)
├── frontend/                         # React 18 + Vite + TypeScript SPA
│   └── src/
│       ├── api/                      # Typed REST API client (client.ts)
│       ├── components/
│       │   └── ui/                   # Reusable UI Library (ModuleLauncherCard, Card, Badge, Button, DataTable, PageHeader)
│       ├── modules/                  # Dedicated Frontend Folders per Executive Module
│       │   ├── CFO/                  # CfoModuleCard.tsx — CFO (Keuangan)
│       │   ├── CHO/                  # ChoModuleCard.tsx — CHO (SDM)
│       │   ├── CPO/                  # CpoModuleCard.tsx — CPO (Persediaan Barang Dagang)
│       │   ├── CDO/                  # CdoModuleCard.tsx — CDO (Pemasaran)
│       │   └── CMO/                  # CmoModuleCard.tsx — CMO (Penjualan)
│       └── test/                     # Vitest + React Testing Library suites (4 suites, 8 tests)
├── benchmarks/k6/                    # Grafana k6 smoke, load, and stress benchmark scripts + k6.d.ts types
├── docker/                           # Nginx, PHP-FPM 8.4, MySQL 8.0 init, and Redis 7.4 configs
├── monitoring/                       # Prometheus scrape/alert rules & provisioned Grafana dashboards
├── docker-compose.yml                # Full-stack multi-container orchestration
└── Makefile                          # Developer workflow shortcuts
```

### Executive ERP Modules

Visiting `http://localhost:5173/` displays the **PT. Slaras Nusa Foodlab** ERP Main Menu with minimalist launcher cards (large icon + title) for each module:

1. **CFO (Keuangan)**: Financial management, cash flow, general ledger, and budgeting (`backend/app/Modules/CFO` & `frontend/src/modules/CFO`).
2. **CHO (SDM)**: Human resources, attendance, payroll, and laboratory analyst KPIs (`backend/app/Modules/CHO` & `frontend/src/modules/CHO`).
3. **CPO (Persediaan Barang Dagang)**: Warehouse stock control, food batches, laboratory reagents, and cold storage (`backend/app/Modules/CPO` & `frontend/src/modules/CPO`).
4. **CDO (Pemasaran)**: Digital campaigns, B2B partner acquisition, branding, and market analytics (`backend/app/Modules/CDO` & `frontend/src/modules/CDO`).
5. **CMO (Penjualan)**: Sales orders, retail distribution, contracts, and revenue targets (`backend/app/Modules/CMO` & `frontend/src/modules/CMO`).

### Reusable UI Component Library (`frontend/src/components/ui/`)

All UI primitives are exported from `frontend/src/components/ui/index.ts` for consistent reuse across every module:

- `ModuleLauncherCard`: Minimalist module launcher button rendering an 80x80 SVG icon badge and module title.
- `Card` & `CardHeader`: Surface containers supporting default and highlighted variants, eyebrow labels, subtitles, and action slots.
- `Button`: Styled action button supporting `primary`, `secondary`, and `ghost` variants.
- `Badge`: Semantic status pill supporting `ok`, `err`, `warn`, `info`, and `neutral` variants.
- `DataTable<T>`: Generic typed table component with column definitions and empty-state rendering.
- `PageHeader`: Top-level page header with eyebrow, title, subtitle, and action bar.

## Install

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose v2+)
- *(Optional for local IDE indexing & host execution)*: PHP 8.2+, Composer 2.x, Node.js 20+, and npm 10+

### Quick Start with Docker Compose

1. Copy the environment configuration files:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

2. Build and start all containers in detached mode (with isolated Linux volumes for `/var/www/html/vendor` and `/app/node_modules`):

```powershell
docker compose up -d --build -V
```

3. Generate the Laravel application key and run database migrations & seeders:

```powershell
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

4. *(Optional — For PhpStorm / VS Code Host Indexing)* Populate `backend/vendor` and `frontend/node_modules` on your host machine so your IDE resolves all PHP and TypeScript types with zero warnings:

```powershell
docker cp erp_foodlab_app:/var/www/html/vendor/. ./backend/vendor
cd frontend && npm install && cd ..
```

### Service Endpoints

| Service | URL | Credentials / Notes |
| :--- | :--- | :--- |
| **React ERP Main Menu** | `http://localhost:5173` | Vite HMR Development Server (`usePolling: true`) |
| **Laravel API (Nginx)** | `http://localhost:8000/api/health` | REST API & Health Check |
| **ERP Modules API** | `http://localhost:8000/api/v1/modules` | Aggregated CFO, CHO, CPO, CDO, CMO JSON |
| **Prometheus Metrics** | `http://localhost:8000/api/metrics` | OpenMetrics / Prometheus `0.0.4` text format |
| **Prometheus UI** | `http://localhost:9090` | Targets, PromQL & Alert Rules |
| **Grafana UI** | `http://localhost:3000` | Default login: `admin` / `admin` |
| **MySQL 8.0** | `localhost:3306` | DB: `erp_foodlab` (`foodlab` / `secret`) |
| **Redis 7.4** | `localhost:6379` | Cache, Session & Queue store |

## Usage

### Running Unit & Feature Tests

**Backend (Pest PHP — 16 tests, 73 assertions)**:

Backend tests run in an isolated in-memory SQLite (`:memory:`) and `array` cache environment configured in `backend/tests/TestCase.php`, ensuring your seeded MySQL database is never wiped during test runs:

```powershell
# Inside Docker
docker compose exec app ./vendor/bin/pest

# Or directly on the host
cd backend && php ./vendor/bin/pest
```

**Frontend (Vitest + React Testing Library — 4 suites, 8 tests)**:

```powershell
# Inside Docker
docker compose exec frontend npm run test:run

# Or directly on the host (+ TypeScript check)
cd frontend && npx tsc --noEmit && npm run test:run
```

### Running k6 Benchmarks

The `k6` service runs under the `benchmark` Docker Compose profile against the internal `nginx` container:

```powershell
# 1. Smoke Test (1 VU, verifies /api/health, /api/v1/samples, and /api/metrics)
docker compose --profile benchmark run --rm k6 run /scripts/smoke.test.js

# 2. Load Test (Ramps up to 50 VUs over 3m, asserts p95 < 300ms)
docker compose --profile benchmark run --rm k6 run /scripts/load.test.js

# 3. Stress Test (Ramps up to 150 VUs over 3m to test Redis & PHP-FPM saturation)
docker compose --profile benchmark run --rm k6 run /scripts/stress.test.js
```

### Inspecting Prometheus & Grafana Dashboards

1. Open Grafana at `http://localhost:3000` and sign in with `admin` / `admin`.
2. Navigate to **Dashboards -> ERP FoodLab -> ERP FoodLab - API & Redis Overview**.
3. Run a k6 load test (`npm run k6:load`) to observe live request rates (`erp_foodlab_http_requests_total`), route latency, Redis memory usage (`redis_memory_used_bytes`), and sample status breakdown (`erp_foodlab_samples_total`).

## API

### `GET /api/v1/modules`

Returns the ERP Main Menu overview across all 5 executive modules (`CFO`, `CHO`, `CPO`, `CDO`, `CMO`), cached in Redis. Dedicated module endpoints are also mounted from each module's `routes.php`:

- `GET /api/v1/modules/cfo` — **CFO (Keuangan)**
- `GET /api/v1/modules/cho` — **CHO (SDM)**
- `GET /api/v1/modules/cpo` — **CPO (Persediaan Barang Dagang)**
- `GET /api/v1/modules/cdo` — **CDO (Pemasaran)**
- `GET /api/v1/modules/cmo` — **CMO (Penjualan)**

### `GET /api/health`

Verifies connectivity to MySQL 8.0 and Redis 7.4:

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

### `GET /api/v1/samples`

Returns the 50 most recent FoodLab quality control samples, cached in Redis under key `erp_foodlab:samples:list`.

### `POST /api/v1/samples`

Creates a new laboratory sample, computes its physicochemical quality grade (`PASS`, `REVIEW`, or `REJECT`), and invalidates the Redis sample list cache.

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
