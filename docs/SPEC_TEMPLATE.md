# ERP Feature Spec Template

Copy this into a fresh chat when building a new module or entity:

## Feature: <Module / Entity Name> (e.g. CPO / PurchaseOrder)
- **Table:** `<table_name>` (columns + types + foreign keys + `softDeletes`)
- **Schema & DB Guardrails:**
  - **Money / Totals:** Always `decimal(18, 2)` (never `double` or `float`)
  - **Tenant & FKs:** Scope to `company_id`; every `*_id` column must have an explicit FK constraint; default to `restrictOnDelete()` for financial, HR, and master data
  - **Soft-Delete Uniqueness:** Never put `deleted_at` in a `UNIQUE` key; use a generated `active_flag` (`unsignedTinyInteger()->nullable()->storedAs('IF(deleted_at IS NULL, 1, NULL)')`, add `'active_flag'` to Model `$hidden`) and scope unique keys by tenant: `unique(['company_id', '<col>', 'active_flag'])`
  - **Indexing:** Prefer composite `(company_id, deleted_at)` and query-driven indexes; do not add standalone indexes on `created_at`, `updated_at`, `deleted_at`, or low-cardinality columns
- **Enum (`app/Enums/`):** `<StatusEnum>: draft | pending | approved | void`
- **Relations:** `belongsTo(...)`, `hasMany(...)`
- **Endpoints (`/api/v1/modules/<mod>/<resource>`):** `index`, `store`, `show`, `update`, `destroy`
- **QueryBuilder (`Service::list`):** filters=[...], sorts=[...], includes=[...]
- **Safety / Business Rules:**
  - `DB::transaction()` on multi-table writes
  - `lockForUpdate()` on stock / balance updates (if applicable)
  - Optional Action (`Approve<Entity>Action`) if multi-step side effects exist
- **Seeder (`database/seeders/DatabaseSeeder.php`):** idempotent sample data (`updateOrCreate` / `withTrashed()` on unique keys inside `DB::transaction()`, end with `Cache::flush()`); assert table populated in `SystemIntegrityTest`
- **Pest Test (`tests/Feature/<Entity>Test.php`):** CRUD, filters, 422 validation, soft delete, active-duplicate rejection + re-create after soft delete
- **Verify:** `php artisan migrate:fresh --seed` (and repeat `db:seed`), `make schema-dump`, `make test-filter FILTER=<Entity>Test`
