# ERP Feature Spec Template

Copy this into a fresh chat when building a new module or entity:

## Feature: <Module / Entity Name> (e.g. CPO / PurchaseOrder)
- **Table:** `<table_name>` (columns + types + foreign keys + `softDeletes`)
- **Schema & DB Guardrails:**
  - **Money / Totals:** Always `decimal(18, 2)` (never `double` or `float`)
  - **Tenant & FKs:** Scope to `company_id`; every `*_id` column must have an explicit FK constraint; default to `restrictOnDelete()` for financial, HR, and master data (never `cascadeOnDelete()`)
  - **Soft-Delete Uniqueness:** Never put `deleted_at` in a `UNIQUE` key; use a generated `active_flag` (`unsignedTinyInteger()->nullable()->storedAs('IF(deleted_at IS NULL, 1, NULL)')`, add `'active_flag'` to Model `$hidden`) and scope unique keys by tenant: `unique(['company_id', '<col>', 'active_flag'])`
  - **Indexing:** Prefer composite `(company_id, deleted_at, ...)` and `(deleted_at, <sort_col>, id)` indexes matching `defaultSort` and frequent filters; do not add standalone indexes on `created_at`, `updated_at`, `deleted_at`, or low-cardinality columns
- **Enum (`app/Enums/`):** `<StatusEnum>: draft | pending | approved | void`
- **Relations:** `belongsTo(...)`, `hasMany(...)`
- **Endpoints (`/api/v1/modules/<mod>/<resource>`):** `index`, `store`, `show`, `update` (`PUT` + partial `PATCH`), `destroy`
- **QueryBuilder & Speed Guardrails (`Service::list`):**
  - filters=[...], sorts=[...], includes=[...]
  - Cap pagination via `IndexQuery::paginate()` (`MAX_PER_PAGE = 100`); never allow unbounded `per_page`
  - Support `?active_company=1` on tenant-scoped services via `IndexQuery::applyActiveCompanyFilter()`
  - Use `IndexQuery::escapeLike()` + `IndexQuery::whereLike()` for text search (skip whitespace-only terms; never use `LIKE` on `decimal`/numeric columns — use exact or range comparison)
  - Never run a duplicate uncached aggregate query (`SUM`/`COUNT`) on `index()` when an unpaginated collection is already fetched or cached
  - Eager-load default relations via `IndexQuery::withDefaultRelations()` (zero N+1 queries)
- **Validation & Safety Rules (`FormRequest` + `Service`):**
  - Support partial `PATCH` updates (`sometimes` on `PATCH`) and fallback to existing model values when computing derived fields (e.g. `total_price`)
  - Enforce numeric bounds (`max:9999999999999999.99`, `decimal:0,2` for `decimal(18,2)`; `max:4294967295` for `int unsigned`; check derived product bounds in `after()`)
  - Enforce cross-field hierarchy & date rules in `FormRequest::after()` (e.g. child `type` belongs to submitted `category`; `closing_date >= purchased_on`)
  - `DB::transaction()` on all writes; `lockForUpdate()` on row updates/deletes and balance/stock changes; re-verify active parent rows inside the transaction using `->whereNull('deleted_at')->sharedLock()`
  - On parent `update`, reject (`422`) reassigning `company_id` or parent FK while active children exist; on parent `destroy`, soft-delete all dependent children and forget all dependent caches (including `ActiveCompany` cache)
- **Seeder (`database/seeders/DatabaseSeeder.php`):** idempotent sample data (`updateOrCreate` / `withTrashed()` on unique keys inside `DB::transaction()`, end with `Cache::flush()`); assert table populated in `SystemIntegrityTest`
- **Pest Tests:**
  - Feature test (`tests/Feature/<Entity>Test.php`): CRUD (`PUT` + partial `PATCH`), filters/sorts/includes, 422 validation (bounds, cross-field, cross-company), soft delete, active-duplicate rejection + re-create after soft delete
  - Guardrail test (`tests/Unit/ApiPatternGuardrailsTest.php`): query-count/N+1 bounds, cache hit 0-query checks, `per_page` cap, schema/service pattern checks
- **Verify:** `php artisan migrate:fresh --seed` (and repeat `db:seed`), `make schema-dump`, `make test-filter FILTER=<Entity>Test`, `make test-filter FILTER=ApiPatternGuardrailsTest`
