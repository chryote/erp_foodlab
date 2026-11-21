# Agentic Development Rules (Low-Token Architecture)

Laravel 11 REST API (`/api/v1/*`) + React 18 (`@tanstack/react-query`) + Tailwind CSS v4 + `shadcn/ui`.

## Backend Rules (Laravel ERP)
1. **Flat Entity Pattern (No Repositories/DTOs/CQRS):**
   - Per entity: `Model` (`app/Models/`), `FormRequest` (`app/Modules/<MOD>/Requests/` or `app/Http/Requests/`), `JsonResource` (`app/Http/Resources/`), `Service` (`app/Modules/<MOD>/Services/`), thin `Controller` (`app/Modules/<MOD>/Controllers/`), and a `Factory` (`database/factories/`) for tests.
   - Extract an `Action` class only for complex multi-step workflows (e.g., `ApprovePurchaseOrderAction`).
   - **Golden Module reference:** `ExpenseItem` (`ExpenseItem.php`, `SaveExpenseItemRequest.php`, `ExpenseItemResource.php`, `ExpenseItemService.php`, `ExpenseItemController.php`, `ExpenseItemFactory.php`, `ExpenseItemTest.php`).
2. **One Schema Source & Query-Driven Indexing:**
   - Read `backend/database/schema/mysql-schema.sql` when present instead of scanning `backend/database/migrations/`.
   - Run `make schema-dump` (`docker compose exec app php artisan schema:dump`) after migration changes; if the app image lacks `mysqldump`, dump from the `mysql` service instead.
   - The dump is a generated MySQL snapshot for reading; Pest runs migrations against in-memory SQLite (keep migrations compatible with both SQLite and MySQL, e.g. `dropForeign(['col'])`).
   - Add composite `(company_id, deleted_at, ...)` and `(deleted_at, <sort_col>, id)` indexes matching `defaultSort` and frequent filters; never add standalone indexes on `created_at`, `updated_at`, `deleted_at`, or low-cardinality columns.
3. **PHP Enums for Every Status:**
   - Store backed string enums in `backend/app/Enums/` (e.g., `LabSampleStatus`), cast on the Eloquent Model, and validate with `Rule::enum(...)` in `FormRequest`. Never use raw status strings or magic integers.
4. **Standardized Filtering, Speed & Auto API Docs:**
   - Use `spatie/laravel-query-builder` (`allowedFilters`, `allowedSorts`, `allowedIncludes`) in `Service::list()`, built via `App\Support\IndexQuery` (capped pagination `MAX_PER_PAGE = 100`, default eager-loading to prevent N+1, `?active_company=1` via `IndexQuery::applyActiveCompanyFilter()`).
   - Use `IndexQuery::escapeLike()` + `whereLike()`/`orWhereLike()` for text search (skip whitespace-only terms; never run `LIKE` on `decimal`/numeric columns — use exact/range comparison).
   - Cache unfiltered lists under `CACHE_KEY_LIST` (`Cache::remember(..., 60, ...)`) and `Cache::forget()` it plus every dependent module cache (and `ActiveCompany` cache when updating/deleting `Company`) after every write; controllers return lists via `RespondsWithApiList`.
   - Never run duplicate uncached aggregate queries (`SUM`/`COUNT`) on `index()` when an unpaginated collection is already fetched or cached.
   - `dedoc/scramble` auto-generates OpenAPI docs at `/docs/api` and `/docs/api.json` from `FormRequest` + `JsonResource`.
5. **Non-Negotiable ERP Data Correctness & Safety Rules:**
   - Wrap all writes in `DB::transaction(...)`, use `->lockForUpdate()` on updates/deletes and stock/balance changes, and re-verify active parents/uniqueness inside the transaction via `->whereNull('deleted_at')->sharedLock()` to close TOCTOU soft-delete races.
   - Support partial `PATCH` (`sometimes`) in `FormRequest` + `payload()` without corrupting derived fields (fall back to existing model values), enforce `decimal:0,2` + `max:` bounds (including derived totals in `after()`), and validate cross-field hierarchy/date rules (`type` belongs to `category`, `closing_date >= purchased_on`).
   - Block (`422`) reassigning `company_id` or parent FKs while active children exist.
   - Never hard-delete financial/operational records: use `SoftDeletes` and/or a void/cancelled enum status with `restrictOnDelete()` FKs (never `cascadeOnDelete()`). On parent soft-delete, reject (`422`) when referenced or soft-delete all dependent children consistently.
6. **Feature & Guardrail Tests Over Manual Testing:**
   - Write one Pest Feature Test per module/entity covering `GET` (filters/sorts/includes/`active_company`), `POST`, `PUT`, partial `PATCH`, `DELETE` (`assertSoftDeleted`), validation `422` (bounds, cross-field, cross-company), and `JsonResource` structure.
   - Start each test with `actingAsErpUser()` and `Cache::flush()` (lists are cached; stale cache causes flaky ordering).
   - Enforce speed/correctness guardrails in `tests/Unit/ApiPatternGuardrailsTest.php` (zero-query warm cache, N+1 query-count bounds, `per_page` cap, schema & service pattern checks).
   - Verify with `make test-filter FILTER=<Name>Test` and `make test-filter FILTER=ApiPatternGuardrailsTest`.
7. **Spec-Driven Workflow:**
   - Implement new features from a concise spec (see `docs/SPEC_TEMPLATE.md`) in a fresh chat.

## Frontend Rules (React + shadcn/ui)
1. **Locked `shadcn/ui` Primitives:** Never read or rewrite `frontend/src/components/ui/shadcn/*` unless explicitly asked. Add primitives via `npx shadcn@latest add <component>` inside `frontend/`.
2. **Declarative ERP Composites (`@/components/ui`):** Prefer `CrudModal`, `ConfirmDialog`, `CrudFieldConfig`, `DataTable`, `Pagination`, `TableFilterBar`, `PageHeader`, `Card`, `Badge`, `Button`, `ModuleLauncherCard`, `HorizontalMenu`, `CascadingHorizontalMenu` (composites keep the shell to ~30–50 lines; field configs are the bulk of a screen — existing CRUD modals run 190–250 lines).
3. **API & Queries:** Use `@/api/client` + `@tanstack/react-query` hooks (`@/lib/cfoResources`) rather than manual `useState`/`useEffect` fetch boilerplate. Adding an API entity requires extending `@/api/client` (types + fetch functions), `cfoQueryKeys`, and a resource hook in `cfoResources.ts`.
4. **Mandatory Confirmation:** All user-triggered CRUD actions (`Tambah`, `Perbarui`, `Hapus`) must confirm via `<ConfirmDialog />` (built into `<CrudModal />`) before mutating.
