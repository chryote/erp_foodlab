<?php

use App\Enums\PayrollItemStatus;
use App\Enums\PayrollRunStatus;
use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\CompanyAsset;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeeDocument;
use App\Models\EmployeeShift;
use App\Models\EmployeeShiftAssignment;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\Packet;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Support\ActiveCompany;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;

describe('Automated Seeded Relationships & Multi-Row Integrity Strategy', function () {
    beforeEach(function () {
        Cache::flush();
        ActiveCompany::clear();
        Artisan::call('db:seed', ['--class' => DatabaseSeeder::class]);
        actingAsErpUser();
    });

    it('discovers every Eloquent model relationship via reflection and verifies seeded graph traversal', function () {
        $modelFiles = File::allFiles(app_path('Models'));
        expect($modelFiles)->not->toBeEmpty();

        $verifiedRelations = 0;

        foreach ($modelFiles as $file) {
            $modelClass = 'App\\Models\\'.$file->getFilenameWithoutExtension();
            $reflection = new ReflectionClass($modelClass);

            if ($reflection->isAbstract() || ! $reflection->isSubclassOf(Model::class)) {
                continue;
            }

            /** @var Model $prototype */
            $prototype = $reflection->newInstance();
            expect($modelClass::query()->count())->toBeGreaterThanOrEqual(
                DatabaseSeeder::MIN_SEED_ROWS,
                "{$modelClass} must have at least ".DatabaseSeeder::MIN_SEED_ROWS.' seeded rows.'
            );

            $relationMethods = [];
            foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
                if (
                    $method->getDeclaringClass()->getName() !== $modelClass
                    || $method->getNumberOfRequiredParameters() > 0
                ) {
                    continue;
                }

                $returnType = $method->getReturnType();
                if (! $returnType instanceof ReflectionNamedType) {
                    continue;
                }

                if (! is_subclass_of($returnType->getName(), Relation::class)) {
                    continue;
                }

                $relationMethods[] = $method->getName();
            }

            if ($relationMethods === []) {
                continue;
            }

            // Eager-load all declared relationships on a representative slice without throwing
            $sampleRows = $modelClass::query()
                ->with($relationMethods)
                ->limit(25)
                ->get();

            expect($sampleRows)->not->toBeEmpty();

            foreach ($relationMethods as $relationName) {
                $verifiedRelations++;

                $relationObj = $prototype->{$relationName}();
                $relatedClass = get_class($relationObj->getRelated());

                // Every declared relationship across all models must be populated in the seeded dataset
                $populatedExists = $modelClass::query()->whereHas($relationName)->exists();
                expect($populatedExists)->toBeTrue(
                    "Relationship {$modelClass}::{$relationName}() has zero populated records after seeding."
                );

                $loadedRecord = $modelClass::query()
                    ->whereHas($relationName)
                    ->with($relationName)
                    ->firstOrFail();

                $loadedValue = $loadedRecord->getRelation($relationName);
                if ($loadedValue instanceof Model) {
                    expect($loadedValue)->toBeInstanceOf($relatedClass);
                } else {
                    expect($loadedValue)->not->toBeEmpty();
                    expect($loadedValue->first())->toBeInstanceOf($relatedClass);
                }
            }
        }

        expect($verifiedRelations)->toBeGreaterThan(30);
    });

    it('enforces set-based foreign-key, cross-tenant company_id cohesion, and rollup invariants across all seeded rows', function () {
        // 1. Zero orphaned required BelongsTo relations across every child table
        expect(CapitalCompany::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(CompanyAsset::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(ExpenseCategory::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(ExpenseType::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(ExpenseType::query()->whereDoesntHave('expenseCategory')->count())->toBe(0);
        expect(ExpenseItem::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(ExpenseItem::query()->whereDoesntHave('expenseCategory')->count())->toBe(0);
        expect(ExpenseItem::query()->whereDoesntHave('expenseType')->count())->toBe(0);
        expect(Employee::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(Employee::query()->whereDoesntHave('employeePosition')->count())->toBe(0);
        expect(Employee::query()->whereDoesntHave('employmentStatus')->count())->toBe(0);
        expect(Employee::query()->whereDoesntHave('payrollGrade')->count())->toBe(0);
        expect(Employee::query()->whereDoesntHave('taxStatus')->count())->toBe(0);
        expect(EmployeeDocument::query()->whereDoesntHave('employee')->count())->toBe(0);
        expect(EmployeeShift::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(EmployeeShiftAssignment::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(EmployeeShiftAssignment::query()->whereDoesntHave('employee')->count())->toBe(0);
        expect(EmployeeShiftAssignment::query()->whereDoesntHave('employeeShift')->count())->toBe(0);
        expect(EmployeeAttendance::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(EmployeeAttendance::query()->whereDoesntHave('employee')->count())->toBe(0);
        expect(PayrollRun::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(PayrollItem::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(PayrollItem::query()->whereDoesntHave('payrollRun')->count())->toBe(0);
        expect(PayrollItem::query()->whereDoesntHave('employee')->count())->toBe(0);
        expect(Item::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(ItemPacket::query()->whereDoesntHave('company')->count())->toBe(0);
        expect(ItemPacket::query()->whereDoesntHave('packet')->count())->toBe(0);
        expect(ItemPacket::query()->whereDoesntHave('item')->count())->toBe(0);

        // 2. Tenant (company_id) and hierarchy cohesion across multi-FK tables
        expect(
            ExpenseType::query()
                ->whereHas('expenseCategory', fn ($q) => $q->whereColumn('expense_categories.company_id', '!=', 'expense_types.company_id'))
                ->count()
        )->toBe(0);

        expect(
            ExpenseItem::query()
                ->whereHas('expenseCategory', fn ($q) => $q->whereColumn('expense_categories.company_id', '!=', 'expense_items.company_id'))
                ->count()
        )->toBe(0);

        expect(
            ExpenseItem::query()
                ->whereHas('expenseType', fn ($q) => $q->whereColumn('expense_types.company_id', '!=', 'expense_items.company_id'))
                ->count()
        )->toBe(0);

        expect(
            ExpenseItem::query()
                ->whereHas('expenseType', fn ($q) => $q->whereColumn('expense_types.expense_category_id', '!=', 'expense_items.expense_category_id'))
                ->count()
        )->toBe(0);

        expect(
            ExpenseItem::query()
                ->whereNotNull('employee_id')
                ->whereHas('employee', fn ($q) => $q->whereColumn('employees.company_id', '!=', 'expense_items.company_id'))
                ->count()
        )->toBe(0);

        expect(
            ExpenseItem::query()
                ->whereNotNull('purchased_on')
                ->whereNotNull('closing_date')
                ->whereColumn('closing_date', '<', 'purchased_on')
                ->count()
        )->toBe(0);

        expect(
            EmployeeShiftAssignment::query()
                ->whereHas('employee', fn ($q) => $q->whereColumn('employees.company_id', '!=', 'employee_shift_assignments.company_id'))
                ->count()
        )->toBe(0);

        expect(
            EmployeeShiftAssignment::query()
                ->whereHas('employeeShift', fn ($q) => $q->whereColumn('employee_shifts.company_id', '!=', 'employee_shift_assignments.company_id'))
                ->count()
        )->toBe(0);

        expect(
            EmployeeAttendance::query()
                ->whereHas('employee', fn ($q) => $q->whereColumn('employees.company_id', '!=', 'employee_attendances.company_id'))
                ->count()
        )->toBe(0);

        expect(
            EmployeeAttendance::query()
                ->whereNotNull('employee_shift_id')
                ->whereHas('employeeShift', fn ($q) => $q->whereColumn('employee_shifts.company_id', '!=', 'employee_attendances.company_id'))
                ->count()
        )->toBe(0);

        expect(
            PayrollItem::query()
                ->whereHas('payrollRun', fn ($q) => $q->whereColumn('payroll_runs.company_id', '!=', 'payroll_items.company_id'))
                ->count()
        )->toBe(0);

        expect(
            PayrollItem::query()
                ->whereHas('employee', fn ($q) => $q->whereColumn('employees.company_id', '!=', 'payroll_items.company_id'))
                ->count()
        )->toBe(0);

        expect(
            ItemPacket::query()
                ->whereHas('item', fn ($q) => $q->whereColumn('items.company_id', '!=', 'item_packet.company_id'))
                ->count()
        )->toBe(0);

        // 3. Approver / Finalizer user links for approved runs & finalized items
        expect(
            PayrollRun::query()
                ->where('status', PayrollRunStatus::APPROVED->value)
                ->whereDoesntHave('approver')
                ->count()
        )->toBe(0);

        expect(
            PayrollItem::query()
                ->where('status', PayrollItemStatus::FINALIZED->value)
                ->whereDoesntHave('finalizer')
                ->count()
        )->toBe(0);

        // 4. Derived math & rollup totals across ALL seeded records
        foreach (CompanyAsset::query()->get() as $asset) {
            expect((float) $asset->total_price)
                ->toBe(round((float) $asset->amount * (float) $asset->price_per_unit, 2));
        }

        foreach (Employee::query()->with('employeePosition')->get() as $employee) {
            expect($employee->employee_attendance_code)->toBe(
                Employee::formatAttendanceCode($employee->id, $employee->name, $employee->employeePosition?->name)
            );
        }

        foreach (PayrollItem::query()->get() as $item) {
            $expectedNet = round(
                ((float) $item->base_salary + (float) $item->bonus + (float) $item->overtime + (float) $item->thr)
                - ((float) $item->bpjs_kesehatan + (float) $item->bpjs_ketenagakerjaan + (float) $item->deduction + (float) $item->pph21),
                2
            );
            expect((float) $item->total_net)->toBe($expectedNet);
        }

        $runs = PayrollRun::query()->with('items')->get();
        expect($runs->count())->toBeGreaterThanOrEqual(DatabaseSeeder::MIN_SEED_ROWS);

        foreach ($runs as $run) {
            expect($run->items)->not->toBeEmpty("Expected seeded PayrollRun #{$run->id} to have PayrollItem children.");
            expect((float) $run->total_base_salary)->toBe(round((float) $run->items->sum('base_salary'), 2));
            expect((float) $run->total_bpjs_kesehatan)->toBe(round((float) $run->items->sum('bpjs_kesehatan'), 2));
            expect((float) $run->total_bpjs_ketenagakerjaan)->toBe(round((float) $run->items->sum('bpjs_ketenagakerjaan'), 2));
            expect((float) $run->total_bonus)->toBe(round((float) $run->items->sum('bonus'), 2));
            expect((float) $run->total_overtime)->toBe(round((float) $run->items->sum('overtime'), 2));
            expect((float) $run->total_deduction)->toBe(round((float) $run->items->sum('deduction'), 2));
            expect((float) $run->total_thr)->toBe(round((float) $run->items->sum('thr'), 2));
            expect((float) $run->total_pph21)->toBe(round((float) $run->items->sum('pph21'), 2));
            expect((float) $run->total_net)->toBe(round((float) $run->items->sum('total_net'), 2));
        }

        // 5. All seeded companies (100+) participate across key modules
        expect(Company::query()->whereHas('capitalCompanies')->count())->toBeGreaterThanOrEqual(DatabaseSeeder::MIN_SEED_ROWS);
        expect(Company::query()->whereHas('employees')->count())->toBeGreaterThanOrEqual(DatabaseSeeder::MIN_SEED_ROWS);
        expect(Company::query()->whereHas('employeeShifts')->count())->toBeGreaterThanOrEqual(DatabaseSeeder::MIN_SEED_ROWS);
        expect(Company::query()->whereHas('payrollRuns')->count())->toBeGreaterThanOrEqual(DatabaseSeeder::MIN_SEED_ROWS);
        expect(Company::query()->whereHas('items')->count())->toBeGreaterThanOrEqual(DatabaseSeeder::MIN_SEED_ROWS);
        expect(Packet::query()->whereHas('items')->count())->toBeGreaterThanOrEqual(DatabaseSeeder::MIN_SEED_ROWS);
    });

    it('serves paginated lists, relationship includes, active_company scoping, and payroll workspace over >= 100 seeded rows', function () {
        $paginatedEndpoints = [
            '/api/v1/modules/cfo/companies',
            '/api/v1/modules/cfo/capital-companies',
            '/api/v1/modules/cfo/expense-categories',
            '/api/v1/modules/cfo/expense-types',
            '/api/v1/modules/cfo/expense-items',
            '/api/v1/modules/cfo/company-assets',
            '/api/v1/modules/cho/employee-positions',
            '/api/v1/modules/cho/employment-statuses',
            '/api/v1/modules/cho/payroll-grades',
            '/api/v1/modules/cho/tax-statuses',
            '/api/v1/modules/cho/employees',
            '/api/v1/modules/cho/payroll-runs',
            '/api/v1/modules/cho/payroll-items',
            '/api/v1/modules/hr/employee-shifts',
            '/api/v1/modules/hr/employee-shift-assignments',
            '/api/v1/modules/hr/employee-attendances',
            '/api/v1/modules/cpo/items',
            '/api/v1/modules/cpo/packets',
            '/api/v1/modules/cpo/packet-names',
            '/api/v1/modules/cpo/packet-vendors',
            '/api/v1/modules/cpo/item-packets',
            '/api/v1/samples',
        ];

        $perPage = 10;
        foreach ($paginatedEndpoints as $endpoint) {
            $response = $this->getJson("{$endpoint}?page=1&per_page={$perPage}")->assertOk();
            $total = (int) $response->json('meta.total');
            expect($total)->toBeGreaterThanOrEqual(
                DatabaseSeeder::MIN_SEED_ROWS,
                "Expected {$endpoint} meta.total >= ".DatabaseSeeder::MIN_SEED_ROWS
            );
            expect($response->json('meta.per_page'))->toBe($perPage);
            expect($response->json('data'))->toHaveCount(min($perPage, $total));
        }

        // Verify explicit ?include= relationship serialization on seeded parent/child endpoints
        $this->getJson('/api/v1/modules/cfo/companies?include=capitalCompanies&page=1&per_page=10')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'capital_companies']]]);

        $this->getJson('/api/v1/modules/cfo/expense-items?include=company,expenseCategory,expenseType&page=1&per_page=10')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'company', 'expense_category', 'expense_type']]]);

        $this->getJson('/api/v1/modules/cho/employees?include=company,employeePosition,employmentStatus,payrollGrade,taxStatus,documents&page=1&per_page=10')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'company', 'employee_position', 'employment_status', 'payroll_grade', 'tax_status', 'documents']]]);

        $this->getJson('/api/v1/modules/cho/payroll-runs?include=company,approver,items&page=1&per_page=10')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'company', 'approver', 'items']]]);

        $this->getJson('/api/v1/modules/hr/employee-attendances?include=company,employee,employeeShift&page=1&per_page=10')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'company', 'employee', 'employee_shift']]]);

        $this->getJson('/api/v1/modules/cpo/item-packets?include=company,packet,item&page=1&per_page=10')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'company', 'packet', 'item']]]);

        $this->getJson('/api/v1/modules/cpo/packets?include=items&page=1&per_page=10')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'items']]]);

        // Verify ?active_company=1 isolates seeded relationships to the requested active company
        $primaryCompany = Company::query()->where('name', 'PT. Slaras Nusa Foodlab')->firstOrFail();
        $secondaryCompany = Company::query()->where('id', '!=', $primaryCompany->id)->orderBy('id')->firstOrFail();

        foreach ([$primaryCompany, $secondaryCompany] as $targetCompany) {
            foreach ([
                '/api/v1/modules/cfo/expense-items?active_company=1',
                '/api/v1/modules/cho/employees?active_company=1',
                '/api/v1/modules/cho/payroll-runs?active_company=1',
                '/api/v1/modules/cho/payroll-items?active_company=1',
                '/api/v1/modules/cpo/item-packets?active_company=1',
            ] as $scopedEndpoint) {
                $res = $this->getJson($scopedEndpoint, [
                    'X-Active-Company-Id' => (string) $targetCompany->id,
                ])->assertOk();

                $rows = $res->json('data');
                expect($rows)->not->toBeEmpty("Expected {$scopedEndpoint} to have seeded rows for company #{$targetCompany->id}");
                foreach ($rows as $row) {
                    expect($row['company_id'])->toBe($targetCompany->id);
                }
            }
        }

        // Verify CHO payroll workspace aggregates seeded employees + payroll items for both periods
        $this->getJson("/api/v1/modules/cho/payroll/workspace?company_id={$primaryCompany->id}&period=2025-12")
            ->assertOk()
            ->assertJsonPath('data.company.id', $primaryCompany->id)
            ->assertJsonPath('data.payroll_run.code', 'PR-2025-12');

        $this->getJson("/api/v1/modules/cho/payroll/workspace?company_id={$primaryCompany->id}&period=2026-01")
            ->assertOk()
            ->assertJsonPath('data.company.id', $primaryCompany->id)
            ->assertJsonPath('data.payroll_run.code', 'PR-2026-01');
    });
});
