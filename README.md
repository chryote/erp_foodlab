# erp_foodlab

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Laravel 11](https://img.shields.io/badge/Laravel-11.x-FF2D20.svg?style=flat-square&logo=laravel)](https://laravel.com)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-2.x-9553E9.svg?style=flat-square)](https://inertiajs.com)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB.svg?style=flat-square&logo=react)](https://react.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4.svg?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix_UI-000000.svg?style=flat-square)](https://ui.shadcn.com)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat-square&logo=docker)](https://docs.docker.com/compose/)
[![MySQL 8.0](https://img.shields.io/badge/MySQL-8.0-4479A1.svg?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com)
[![Redis 7](https://img.shields.io/badge/Redis-7.4-DC382D.svg?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![k6](https://img.shields.io/badge/k6-Benchmark-7D64FF.svg?style=flat-square&logo=k6)](https://k6.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-E6522C.svg?style=flat-square&logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-Dashboards-F46800.svg?style=flat-square&logo=grafana&logoColor=white)](https://grafana.com)

> Full-stack ERP monorepo powered by Laravel 11, Inertia.js, React 18, Tailwind CSS v4, `shadcn/ui`, Docker, MySQL, Redis, Pest/Vitest, k6, and Prometheus + Grafana.

`erp_foodlab` (**PT. Slaras Nusa Foodlab**) is a modular full-stack ERP system built with **Laravel 11 + Inertia.js** (`backend/`) and **React 18 + Vite + TypeScript + Tailwind CSS v4 + `shadcn/ui`** (`frontend/`). It features a low-token declarative UI architecture across five executive ERP modules (**CFO**, **CHO**, **CPO**, **CDO**, **CMO**), containerized backing services via **Docker Compose** (**MySQL 8.0**, **Redis 7.4**, **Nginx**), automated unit and feature test suites (**Pest PHP** + **Vitest & React Testing Library**), load/stress benchmarking via **Grafana k6**, and pre-provisioned **Prometheus + Grafana** observability dashboards.

## Table of Contents

- [Security](#security)
- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API & Inertia Routes](#api--inertia-routes)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Security

Never commit production secrets, `.env` files, or private API keys to version control. Default credentials in `.env.example` and `docker-compose.yml` are strictly for local containerized development. For production deployments:

- Generate a strong `APP_KEY` via `php artisan key:generate`.
- Configure non-default passwords for `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `REDIS_PASSWORD`, and `GRAFANA_ADMIN_PASSWORD`.
- Restrict public network access to `/api/metrics`, Prometheus (`:9090`), and Redis (`:6379`) behind an internal VPC or ingress firewall.

## Background

Modern laboratory and enterprise resource planning systems require clear modular boundaries, reusable `shadcn/ui` primitives, declarative CRUD abstractions that minimize AI agent token consumption, low-latency Redis caching, automated testing, repeatable load verification, and real-time telemetry from day one.

### Repository Structure

```text
erp_foodlab/
├── AGENTS.md                         # Low-token agentic development rules for Inertia.js + shadcn/ui
├── backend/                          # Laravel 11 (PHP 8.4), Inertia.js, MySQL, Redis, Prometheus, Pest PHP
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/          # ErpInertiaController, ErpMenuController, HealthController, LabSampleController, MetricsController
│   │   │   └── Middleware/           # HandleInertiaRequests, RecordPrometheusMetrics
│   │   ├── Models/                   # Company, CapitalCompany, LabSample, User
│   │   ├── Modules/                  # Dedicated Backend Folders per Executive Module
│   │   │   ├── CFO/                  # CFO (Keuangan) — CompanyController, CapitalCompanyController, Services, routes.php
│   │   │   ├── CHO/                  # CHO (SDM) — Controllers, Services, routes.php
│   │   │   ├── CPO/                  # CPO (Persediaan Barang Dagang) — Controllers, Services, routes.php
│   │   │   ├── CDO/                  # CDO (Pemasaran) — Controllers, Services, routes.php
│   │   │   └── CMO/                  # CMO (Penjualan) — Controllers, Services, routes.php
│   │   └── Services/                 # LabSampleService, MetricsCollectorService
│   ├── resources/views/app.blade.php # Inertia.js root Blade template (@inertiaHead & @inertia)
│   └── tests/                        # Pest PHP Unit & Feature test suites (31 tests, 244 assertions)
├── frontend/                         # React 18 + Inertia.js + Vite + TypeScript + Tailwind v4 + shadcn/ui
│   ├── components.json               # Official shadcn/ui CLI configuration
│   └── src/
│       ├── Pages/
│       │   └── Dashboard.tsx         # Inertia.js ERP Main Dashboard Page
│       ├── api/                      # Typed REST API fallback client (client.ts)
│       ├── lib/
│       │   ├── inertia.ts            # Unified Inertia server-props & CRUD resource hooks
│       │   └── utils.ts              # Tailwind + clsx cn() class merger
│       ├── components/
│       │   └── ui/
│       │       ├── shadcn/           # Locked shadcn/ui base primitives (Button, Badge, Card, Dialog, Input, Label, Table)
│       │       └── *.tsx             # Declarative ERP composites (CrudModal, DataTable, SummaryBanner, CascadingHorizontalMenu, ModuleLauncherCard, PageHeader, Pagination)
│       ├── modules/                  # Dedicated Frontend Folders per Executive Module
│       │   ├── CFO/                  # CfoModuleCard, CompanyCrudModal, CapitalCompanyCrudModal
│       │   ├── CHO/                  # ChoModuleCard.tsx — CHO (SDM)
│       │   ├── CPO/                  # CpoModuleCard.tsx — CPO (Persediaan Barang Dagang)
│       │   ├── CDO/                  # CdoModuleCard.tsx — CDO (Pemasaran)
│       │   └── CMO/                  # CmoModuleCard.tsx — CMO (Penjualan)
│       └── test/                     # Vitest + React Testing Library suites (5 suites, 18 tests)
├── benchmarks/k6/                    # Grafana k6 smoke, load, and stress benchmark scripts
├── docker/                           # Nginx, PHP-FPM 8.4, MySQL 8.0 init, and Redis 7.4 configs
├── monitoring/                       # Prometheus scrape/alert rules & provisioned Grafana dashboards
├── docker-compose.yml                # Full-stack multi-container orchestration
└── Makefile                          # Developer workflow shortcuts
```

### Executive ERP Modules

Visiting `http://localhost:5173/` or `http://localhost:8000/` displays the **PT. Slaras Nusa Foodlab** ERP Main Menu with launcher cards and cascading submenus:

1. **CFO (Keuangan)**: Financial management, cash flow, general ledger, company management (`Perusahaan` & `Input Pemegang Saham`), and capital portfolio overview (`Daftar Kapital Perusahaan` & `Detail Pemegang Saham`).
2. **CHO (SDM)**: Human resources, attendance, payroll, and laboratory analyst KPIs (`backend/app/Modules/CHO` & `frontend/src/modules/CHO`).
3. **CPO (Persediaan Barang Dagang)**: Warehouse stock control, food batches, laboratory reagents, and cold storage (`backend/app/Modules/CPO` & `frontend/src/modules/CPO`).
4. **CDO (Pemasaran)**: Digital campaigns, B2B partner acquisition, branding, and market analytics (`backend/app/Modules/CDO` & `frontend/src/modules/CDO`).
5. **CMO (Penjualan)**: Sales orders, retail distribution, contracts, and revenue targets (`backend/app/Modules/CMO` & `frontend/src/modules/CMO`).

### Two-Tier `shadcn/ui` & Declarative ERP Component Architecture

To keep AI agent token usage minimal during development (see [`AGENTS.md`](AGENTS.md)):

1. **Locked `shadcn/ui` Base Layer (`frontend/src/components/ui/shadcn/`)**:
   - Standard Radix + Tailwind `shadcn/ui` primitives (`ShadcnButton`, `ShadcnBadge`, `ShadcnCard`, `Dialog`, `ShadcnInput`, `ShadcnLabel`, `ShadcnTable`).
   - Add new primitives via `npx shadcn@latest add <component>` inside `frontend/`.
2. **Declarative ERP Composite Layer (`frontend/src/components/ui/`)**:
   - `CrudModal<T>` + `CrudFieldConfig<T>[]`: Schema-driven CRUD dialog supporting `text`, `number`, `decimal` (Indonesian dot-thousand / comma-decimal auto-formatter), and `select` fields, computed columns (`CrudComputedColumnConfig<T>`), custom row action buttons (`CrudRowActionConfig<T>`), read-only master-detail mode (`readOnly`), and client/server pagination.
   - `SummaryBanner`: Highlighted KPI/capital summary bar inside modals and dashboards.
   - `CascadingHorizontalMenu` & `HorizontalMenu`: Multi-level horizontal submenu navigation.
   - `ModuleLauncherCard`, `PageHeader`, `Card`, `CardHeader`, `DataTable`, `Pagination`, `TableFilterBar`, `Badge`, `Button`.
3. **Inertia Resource Bridge (`frontend/src/lib/inertia.ts`)**:
   - Consumes Inertia server props (`modules`, `companies`, `capitalCompanies`) directly when rendered by Laravel Inertia and dispatches mutations via `router.post`, `router.put`, and `router.delete`, with automatic REST fallback for standalone Vite/Vitest execution.

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

2. Build and start all containers in detached mode (using `-V` to initialize fresh `/var/www/html/vendor` and `/app/node_modules` anonymous volumes):

```powershell
docker compose up -d --build -V
```

3. Generate the Laravel application key and run database migrations & seeders:

```powershell
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

4. *(Whenever you add new Composer or npm packages)* Rebuild and refresh the anonymous volumes so the running containers pick up the new dependencies:

```powershell
docker compose up -d --build -V app frontend
```

### Service Endpoints

| Service | URL | Credentials / Notes |
| :--- | :--- | :--- |
| **React ERP Dev Server** | `http://localhost:5173` | Vite HMR Development Server (`usePolling: true`) |
| **Laravel Inertia Dashboard** | `http://localhost:8000` | Server-rendered Inertia.js entry point (`ErpInertiaController`) |
| **Laravel Health Check** | `http://localhost:8000/api/health` | REST API & Infrastructure Health Check |
| **ERP Modules API** | `http://localhost:8000/api/v1/modules` | Aggregated CFO, CHO, CPO, CDO, CMO JSON |
| **Prometheus Metrics** | `http://localhost:8000/api/metrics` | OpenMetrics / Prometheus `0.0.4` text format |
| **Prometheus UI** | `http://localhost:9090` | Targets, PromQL & Alert Rules |
| **Grafana UI** | `http://localhost:3000` | Default login: `admin` / `admin` |
| **MySQL 8.0** | `localhost:3306` | DB: `erp_foodlab` (`foodlab` / `secret`) |
| **Redis 7.4** | `localhost:6379` | Cache, Session & Queue store |

## Usage

### Running Unit & Feature Tests

**Backend (Pest PHP — 9 suites, 31 tests, 244 assertions)**:

Backend tests run in an isolated in-memory SQLite (`:memory:`) and `array` cache environment configured in `backend/tests/TestCase.php`, ensuring your seeded MySQL database is never wiped during test runs:

```powershell
# Inside Docker
docker compose exec app ./vendor/bin/pest

# Or directly on the host
cd backend && ./vendor/bin/pest
```

**Frontend (Vitest + React Testing Library — 5 suites, 18 tests)**:

```powershell
# Inside Docker
docker compose exec frontend npm run test:run

# Or directly on the host (+ production build check)
cd frontend && npm run test:run && npm run build
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

## API & Inertia Routes

### Inertia Web Routes (`backend/routes/web.php`)

- `GET /` — Renders the `Dashboard` Inertia page with `modules`, `companies`, and `capitalCompanies` props.
- `POST /cfo/companies` — Creates a company and redirects back with updated Inertia props.
- `PUT /cfo/companies/{company}` — Updates a company and redirects back.
- `DELETE /cfo/companies/{company}` — Soft-deletes a company and redirects back.
- `POST /cfo/capital-companies` — Adds a stakeholder capital record (`company_id`, `stakeholder_name`, `capital`) and redirects back.
- `PUT /cfo/capital-companies/{capitalCompany}` — Updates a stakeholder capital record and redirects back.
- `DELETE /cfo/capital-companies/{capitalCompany}` — Soft-deletes a stakeholder capital record and redirects back.

### REST API Endpoints (`backend/routes/api.php`)

- `GET /api/v1/modules` — Returns the ERP Main Menu overview across all 5 executive modules (`CFO`, `CHO`, `CPO`, `CDO`, `CMO`), cached in Redis.
- `GET|POST /api/v1/modules/cfo/companies` & `GET|PUT|DELETE /api/v1/modules/cfo/companies/{company}` — CFO Company CRUD JSON API.
- `GET|POST /api/v1/modules/cfo/capital-companies` & `GET|PUT|DELETE /api/v1/modules/cfo/capital-companies/{capitalCompany}` — CFO Stakeholder & Capital CRUD JSON API.
- `GET /api/health` — Verifies connectivity to MySQL 8.0 and Redis 7.4.
- `GET|POST /api/v1/samples` — Lists and creates FoodLab quality control samples.
- `GET /api/metrics` — Exposes application counters and histograms in Prometheus `0.0.4` text format.

## Maintainers

- [@erp-foodlab-team](https://github.com/erp-foodlab)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for development setup, low-token component conventions, testing requirements, and pull request guidelines.

## License

[MIT](LICENSE) © 2026 ERP FoodLab Contributors
