# Agentic Development Rules (Low-Token Architecture)

This repository uses **Laravel 11 REST API + React 18 (`@tanstack/react-query`) + Tailwind CSS v4 + `shadcn/ui`**. Follow these rules to keep context reads (input tokens) and generated code (output tokens) minimal:

## 1. Do Not Read or Regenerate Locked `shadcn/ui` Primitives
- Raw `shadcn/ui` primitives live in `frontend/src/components/ui/shadcn/*` (`ShadcnButton`, `ShadcnBadge`, `ShadcnCard`, `Dialog`, `ShadcnInput`, `ShadcnLabel`, `ShadcnTable`).
- **Never read or rewrite files in `frontend/src/components/ui/shadcn/`** unless explicitly asked to modify a base primitive.
- To add a new `shadcn/ui` primitive, run `npx shadcn@latest add <component>` inside `frontend/`.

## 2. Prefer Declarative ERP Composite Components Over Raw JSX
- Import high-level reusable ERP components from `@/components/ui`:
  - `CrudModal`, `ConfirmDialog`, `CrudFieldConfig`, `CrudComputedColumnConfig`, `CrudRowActionConfig`, `SummaryBanner`
  - `DataTable`, `Pagination`, `TableFilterBar`
  - `PageHeader`, `Card`, `CardHeader`, `Badge`, `Button`
  - `ModuleLauncherCard`, `HorizontalMenu`, `CascadingHorizontalMenu`
- Define new ERP CRUD screens using a declarative `CrudFieldConfig<T>[]` array + `<CrudModal />` (~30–50 lines) instead of hand-writing `<Dialog>`, `<Form>`, and `<Table>` JSX.

## 3. Use REST API Client (`@/api/client`) & TanStack Query Hooks (`@/lib/cfoResources`)
- Laravel REST API routes (`backend/routes/api.php` -> `backend/app/Modules/*/routes.php`) serve `/api/v1/*` JSON endpoints.
- On the frontend (`frontend/src/App.tsx` + `frontend/src/lib/cfoResources.ts`), use `@tanstack/react-query` (`useQuery`, `useMutation`, `queryClient.invalidateQueries`) backed by `@/api/client` rather than writing manual `useState` / `useEffect` / `try-catch` fetch boilerplate in feature modals.

## 4. Mandatory Confirmation Dialog for All User-Triggered CRUD Actions
- All CRUD actions clicked by the user (Create / `Tambah`, Update / `Perbarui`, Delete / `Hapus`) **must** display a confirmation dialog (`ConfirmDialog`) and wait for explicit user confirmation before executing the mutation.
- `<CrudModal />` enforces this confirmation dialog automatically for `onCreate`, `onUpdate`, and `onDelete` actions. Any custom CRUD mutation outside `<CrudModal />` must wrap its trigger with `<ConfirmDialog />` from `@/components/ui`.
