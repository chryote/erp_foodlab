# Agentic Development Rules (Low-Token Architecture)

Laravel 11 REST API (`/api/v1/*`) + React 18 (`@tanstack/react-query`) + Tailwind CSS v4 + `shadcn/ui`.

## Backend Rules (Laravel ERP)
1. **Flat Entity Pattern (No Repositories/DTOs/CQRS):**
   - Per entity: `Model` (`app/Models/`), `FormRequest` (`app/Modules/<MOD>/Requests/` or `app/Http/Requests/`), `JsonResource` (`app/Http/Resources/`), `Service` (`app/Modules/<MOD>/Services/`), thin `Controller` (`app/Modules/<MOD>/Controllers/`), and a `Factory` (`database/factories/`) for tests.
   - Extract an `Action` class only for complex multi-step workflows (e.g., `ApprovePurchaseOrderAction`).
   - **Golden Module reference:** `ExpenseItem` (`ExpenseItem.php`, `SaveExpenseItemRequest.php`, `ExpenseItemResource.php`, `ExpenseItemService.php`, `ExpenseItemController.php`, `ExpenseItemFactory.php`, `ExpenseItemTest.php`).
2. **One Schema Source:**
   - Read `backend/database/schema/mysql-schema.sql` when present instead of scanning `backend/database/migrations/`.
   - Run `make schema-dump` (`docker compose exec app php artisan schema:dump`) after migration changes; if the app image lacks `mysqldump`, dump from the `mysql` service instead.
   - The dump is a generated MySQL snapshot for reading; Pest runs migrations against in-memory SQLite, so migrations stay the source of truth for tests.
3. **PHP Enums for Every Status:**
   - Store backed string enums in `backend/app/Enums/` (e.g., `LabSampleStatus`), cast on the Eloquent Model, and validate with `Rule::enum(...)` in `FormRequest`. Never use raw status strings or magic integers.
4. **Standardized Filtering & Auto API Docs:**
   - Use `spatie/laravel-query-builder` (`allowedFilters`, `allowedSorts`, `allowedIncludes`) in `Service::list()`, built via `App\Support\IndexQuery` (pagination, default eager-loading, cache).
   - Cache unfiltered lists under a `CACHE_KEY_LIST` constant (`Cache::remember(..., 60, ...)`) and `Cache::forget()` it after every write; controllers return lists through the `RespondsWithApiList` trait.
   - `dedoc/scramble` auto-generates OpenAPI docs at `/docs/api` and `/docs/api.json` from `FormRequest` + `JsonResource`.
5. **3 Non-Negotiable ERP Safety Rules:**
   - Wrap all multi-table or state-changing writes in `DB::transaction(...)`.
   - Use `->lockForUpdate()` inside transactions when modifying inventory quantities, stock, or account balances.
   - Never hard-delete financial/operational records: always use `SoftDeletes` and/or a void/cancelled enum status. Do not copy the legacy `cascadeOnDelete()` FKs onto new financial tables — use `restrictOnDelete()` so a parent hard-delete cannot bypass soft deletes.
6. **Feature Tests Over Manual Testing:**
   - Write one Pest Feature Test per module/entity covering `GET` (filters/sorts/includes), `POST`, `PUT`, `PATCH`, `DELETE` (`assertSoftDeleted`), validation `422`, and `JsonResource` structure.
   - Start each test with `actingAsErpUser()` and `Cache::flush()` (lists are cached; stale cache causes flaky ordering).
   - Verify with `php artisan test --filter=<Name>Test` (or `make test-filter FILTER=<Name>Test`).
7. **Spec-Driven Workflow:**
   - Implement new features from a concise 15-line spec (see `docs/SPEC_TEMPLATE.md`) in a fresh chat.

## Frontend Rules (React + shadcn/ui)
1. **Locked `shadcn/ui` Primitives:** Never read or rewrite `frontend/src/components/ui/shadcn/*` unless explicitly asked. Add primitives via `npx shadcn@latest add <component>` inside `frontend/`.
2. **Declarative ERP Composites (`@/components/ui`):** Prefer `CrudModal`, `ConfirmDialog`, `CrudFieldConfig`, `DataTable`, `Pagination`, `TableFilterBar`, `PageHeader`, `Card`, `Badge`, `Button`, `ModuleLauncherCard`, `HorizontalMenu`, `CascadingHorizontalMenu` (composites keep the shell to ~30–50 lines; field configs are the bulk of a screen — existing CRUD modals run 190–250 lines).
3. **API & Queries:** Use `@/api/client` + `@tanstack/react-query` hooks (`@/lib/cfoResources`) rather than manual `useState`/`useEffect` fetch boilerplate. Adding an API entity requires extending `@/api/client` (types + fetch functions), `cfoQueryKeys`, and a resource hook in `cfoResources.ts`.
4. **Mandatory Confirmation:** All user-triggered CRUD actions (`Tambah`, `Perbarui`, `Hapus`) must confirm via `<ConfirmDialog />` (built into `<CrudModal />`) before mutating.
