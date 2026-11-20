# 15-Line ERP Feature Spec Template

Copy this into a fresh chat when building a new module or entity:

```markdown
## Feature: <Module / Entity Name> (e.g. CPO / PurchaseOrder)
- **Table:** `<table_name>` (columns + types + foreign keys + `softDeletes`)
- **Enum (`app/Enums/`):** `<StatusEnum>: draft | pending | approved | void`
- **Relations:** `belongsTo(...)`, `hasMany(...)`
- **Endpoints (`/api/v1/modules/<mod>/<resource>`):** `index`, `store`, `show`, `update`, `destroy`
- **QueryBuilder (`Service::list`):** filters=[...], sorts=[...], includes=[...]
- **Safety / Business Rules:**
  - `DB::transaction()` on multi-table writes
  - `lockForUpdate()` on stock / balance updates (if applicable)
  - Optional Action (`Approve<Entity>Action`) if multi-step side effects exist
- **Seeder (`database/seeders/DatabaseSeeder.php`):** idempotent sample data (`updateOrCreate` / `withTrashed()` on unique keys inside `DB::transaction()`, end with `Cache::flush()`); assert table populated in `SystemIntegrityTest`
- **Pest Test (`tests/Feature/<Entity>Test.php`):** CRUD, filters, 422 validation, soft delete
- **Verify:** `php artisan migrate:fresh --seed` (and repeat `db:seed`), `make schema-dump`, `make test-filter FILTER=<Entity>Test`
```
