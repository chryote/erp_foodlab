<?php

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\CompanyAsset;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeeDocument;
use App\Models\EmployeePosition;
use App\Models\EmployeeShift;
use App\Models\EmployeeShiftAssignment;
use App\Models\EmploymentStatus;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Models\LabSample;
use App\Models\PayrollGrade;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\TaxStatus;
use App\Modules\CFO\Services\CompanyAssetService;
use App\Modules\CFO\Services\CompanyService;
use App\Modules\CHO\Services\EmployeeService;
use App\Modules\CHO\Services\PayrollItemService;
use App\Modules\CHO\Services\PayrollRunService;
use App\Modules\HR\Actions\RecordAttendanceAction;
use App\Modules\HR\Services\EmployeeShiftService;
use App\Support\ActiveCompany;
use App\Support\IndexQuery;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

describe('API Pattern, Speed & Correctness Guardrails', function () {
    beforeEach(function () {
        Cache::flush();
        ActiveCompany::clear();
        actingAsErpUser();
    });

    it('enforces standardized IndexQuery, transaction, locking, and cache patterns across all CRUD services and controllers', function () {
        $serviceFiles = File::glob(app_path('Modules/*/Services/*Service.php'));
        expect($serviceFiles)->not->toBeEmpty();

        foreach ($serviceFiles as $servicePath) {
            $contents = File::get($servicePath);

            // Only CRUD list services declare CACHE_KEY_LIST; overview services declare CACHE_KEY.
            if (! str_contains($contents, 'CACHE_KEY_LIST')) {
                continue;
            }

            expect($contents)
                ->toContain('IndexQuery::make(')
                ->toContain('IndexQuery::isPaginated(')
                ->toContain('IndexQuery::paginate(')
                ->toContain('IndexQuery::isCacheable(')
                ->toContain('DB::transaction(')
                ->toContain('lockForUpdate()');

            $invalidatesListCache = str_contains($contents, 'Cache::forget(self::CACHE_KEY_LIST)')
                || (str_contains($contents, 'self::CACHE_KEY_LIST') && str_contains($contents, 'Cache::forget('));
            expect($invalidatesListCache)->toBeTrue(
                "{$servicePath} must invalidate self::CACHE_KEY_LIST on writes"
            );
        }

        $controllerFiles = File::glob(app_path('Modules/*/Controllers/*Controller.php'));
        expect($controllerFiles)->not->toBeEmpty();

        foreach ($controllerFiles as $controllerPath) {
            $contents = File::get($controllerPath);
            if (! str_contains($contents, 'public function index(Request')) {
                continue;
            }

            $relative = str_replace([app_path().DIRECTORY_SEPARATOR, '.php', DIRECTORY_SEPARATOR], ['App\\', '', '\\'], $controllerPath);
            $traits = class_uses_recursive($relative);

            expect($traits)->toContain(RespondsWithApiList::class);
            expect($contents)->toContain('$this->respondWithList(');
        }
    });

    it('bans known CFO and CHO speed and correctness anti-patterns in services, requests, and mysql schema', function () {
        expect(IndexQuery::MAX_PER_PAGE)->toBeLessThanOrEqual(100);

        $guardedServices = array_merge(
            File::glob(app_path('Modules/CFO/Services/*Service.php')),
            File::glob(app_path('Modules/CHO/Services/*Service.php'))
        );

        foreach ($guardedServices as $servicePath) {
            $contents = File::get($servicePath);
            if (! str_contains($contents, 'CACHE_KEY_LIST')) {
                continue;
            }

            expect($contents)
                ->toContain('IndexQuery::applyActiveCompanyFilter(')
                ->toContain('IndexQuery::escapeLike(')
                ->not->toMatch('/->(?:or)?[wW]here\(\s*[\'"](?:capital|amount|price_per_unit|total_price|grade|base_salary|position_allowance|total_gross|total_company_cost|net_employee_received|bpjs_kesehatan|bpjs_ketenagakerjaan|bonus|overtime|deduction|thr|pph21|total_net)[\'"]\s*,\s*[\'"]like[\'"]/');
        }

        $companyService = File::get(app_path('Modules/CFO/Services/CompanyService.php'));
        expect($companyService)
            ->toContain('companyAssets()->delete()')
            ->toContain('CompanyAssetService::CACHE_KEY_LIST');

        foreach (['EmploymentStatusService.php', 'PayrollGradeService.php', 'TaxStatusService.php', 'EmployeePositionService.php'] as $choMasterService) {
            $masterCode = File::get(app_path('Modules/CHO/Services/'.$choMasterService));
            expect($masterCode)->toContain('EmployeeService::CACHE_KEY_LIST');
        }

        foreach ([
            'Modules/CFO/Requests/SaveCapitalCompanyRequest.php',
            'Modules/CFO/Requests/SaveCompanyAssetRequest.php',
            'Modules/CFO/Requests/SaveExpenseItemRequest.php',
            'Modules/CHO/Requests/SavePayrollGradeRequest.php',
            'Modules/CHO/Requests/SavePayrollItemRequest.php',
        ] as $requestPath) {
            $requestCode = File::get(app_path($requestPath));
            expect($requestCode)
                ->toContain("isMethod('PATCH')")
                ->toContain('decimal:0,2')
                ->toContain('9999999999999999.99');
        }

        $schemaSql = File::get(database_path('schema/mysql-schema.sql'));
        foreach ([
            'capital_companies',
            'company_assets',
            'expense_categories',
            'expense_types',
            'expense_items',
            'employee_positions',
            'employment_statuses',
            'payroll_grades',
            'tax_statuses',
            'employees',
            'payroll_runs',
            'payroll_items',
        ] as $table) {
            preg_match("/CREATE TABLE `{$table}` \\((.*?)\\) ENGINE=/s", $schemaSql, $matches);
            expect($matches)->toHaveCount(2, "Table {$table} missing from mysql-schema.sql");
            $tableSql = $matches[1];

            expect($tableSql)
                ->not->toContain('ON DELETE CASCADE')
                ->toContain('deleted_at');
        }
    });

    it('caps per_page, eliminates N+1 and duplicate SUM queries, and serves warm caches with zero queries', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Speed Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Speed Beta']);

        CapitalCompany::factory()->count(5)->create(['company_id' => $companyA->id, 'capital' => 1000]);
        CompanyAsset::factory()->count(5)->create(['company_id' => $companyA->id]);

        $cat = ExpenseCategory::factory()->create(['company_id' => $companyA->id]);
        $type = ExpenseType::factory()->create(['company_id' => $companyA->id, 'expense_category_id' => $cat->id]);
        ExpenseItem::factory()->count(5)->create([
            'company_id' => $companyA->id,
            'expense_category_id' => $cat->id,
            'expense_type_id' => $type->id,
        ]);

        // 1. Pagination upper cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cfo/capital-companies?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. ActiveCompany resolves without hitting DB on subsequent requests
        $this->postJson('/api/v1/active-company', ['company_id' => $companyB->id])->assertOk();

        // Warm caches once
        $this->getJson('/api/v1/modules/cfo/capital-companies')->assertOk();
        $this->getJson('/api/v1/modules/cfo/company-assets')->assertOk();
        $this->getJson('/api/v1/modules/cfo/expense-items')->assertOk();

        // Warm cache hit + cached ActiveCompany must execute 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cfo/capital-companies')
            ->assertOk()
            ->assertJsonPath('meta.total_capital', 5000);
        $this->getJson('/api/v1/modules/cfo/company-assets')->assertOk();
        $this->getJson('/api/v1/modules/cfo/expense-items')->assertOk();
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 3. Cold-cache query counts must be bounded (no N+1, no duplicate SUM(capital))
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cfo/capital-companies', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])
            ->assertOk()
            ->assertJsonPath('meta.total_capital', 5000);
        $capitalQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 active company lookup + 1 capital_companies select + 1 companies eager load = <= 3 queries (no SUM query)
        expect($capitalQueries->count())->toBeLessThanOrEqual(3);
        expect($capitalQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cfo/expense-items', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])
            ->assertOk();
        $itemQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // ActiveCompany cached (0 queries) + 1 expense_items + 3 eager loads = <= 4 queries
        expect($itemQueries->count())->toBeLessThanOrEqual(4);
        expect($itemQueries->contains(fn ($q) => str_contains($q['query'], 'from "companies" where "companies"."id" =')))->toBeFalse();
    });

    it('enforces CFO data correctness edge cases: delete cleanup, hierarchy locks, partial PATCH, bounds, active_company, and LIKE escaping', function () {
        $companyA = Company::factory()->create(['name' => 'PT. 100% Alpha_Lab']);
        $companyB = Company::factory()->create(['name' => 'PT. Beta Normal']);

        $asset = CompanyAsset::factory()->create([
            'company_id' => $companyA->id,
            'amount' => 4,
            'price_per_unit' => 2500.50,
            'total_price' => 10002.00,
        ]);

        // Warm company-assets cache before company operations
        $this->getJson('/api/v1/modules/cfo/company-assets')->assertOk()->assertJsonCount(1, 'data');
        expect(Cache::has(CompanyAssetService::CACHE_KEY_LIST))->toBeTrue();

        // Partial PATCH on CompanyAsset preserves omitted amount and recomputes total_price accurately
        $this->patchJson("/api/v1/modules/cfo/company-assets/{$asset->id}", [
            'price_per_unit' => 3000.25,
        ])->assertOk()
            ->assertJsonPath('data.amount', 4);

        expect((float) $this->getJson("/api/v1/modules/cfo/company-assets/{$asset->id}")->json('data.total_price'))
            ->toBe(12001.0);

        // Partial PATCH on Company works without re-sending all fields
        $this->patchJson("/api/v1/modules/cfo/companies/{$companyA->id}", [
            'series' => 5,
        ])->assertOk()
            ->assertJsonPath('data.name', 'PT. 100% Alpha_Lab')
            ->assertJsonPath('data.series', 5);

        // Oversized values & >2 decimal places fail with 422, never 500
        $this->postJson('/api/v1/modules/cfo/capital-companies', [
            'company_id' => $companyA->id,
            'stakeholder_name' => 'Precision Tester',
            'capital' => 100.123,
        ])->assertUnprocessable()->assertJsonValidationErrors(['capital']);

        $this->postJson('/api/v1/modules/cfo/company-assets', [
            'company_id' => $companyA->id,
            'asset_date' => '2026-11-21',
            'name' => 'Overflow Asset',
            'amount' => 1000,
            'price_per_unit' => 9999999999999999.00,
        ])->assertUnprocessable()->assertJsonValidationErrors(['price_per_unit']);

        // Cross-category ExpenseItem and invalid closing_date fail with 422
        $catA1 = ExpenseCategory::factory()->create(['company_id' => $companyA->id, 'name' => 'Cat 1']);
        $catA2 = ExpenseCategory::factory()->create(['company_id' => $companyA->id, 'name' => 'Cat 2']);
        $typeA1 = ExpenseType::factory()->create(['company_id' => $companyA->id, 'expense_category_id' => $catA1->id]);

        $this->postJson('/api/v1/modules/cfo/expense-items', [
            'company_id' => $companyA->id,
            'expense_category_id' => $catA2->id,
            'expense_type_id' => $typeA1->id,
            'name' => 'Mismatched Category',
            'amount' => 50000,
            'purchased_on' => '2026-11-20',
            'closing_date' => '2026-11-10',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['expense_category_id', 'closing_date']);

        // Create valid item, then ensure parent ExpenseCategory / ExpenseType cannot change company_id while referenced
        $itemRes = $this->postJson('/api/v1/modules/cfo/expense-items', [
            'company_id' => $companyA->id,
            'expense_type_id' => $typeA1->id,
            'name' => 'Valid Item',
            'amount' => 50000,
            'purchased_on' => '2026-11-20',
        ])->assertCreated();
        expect($itemRes->json('data.expense_category_id'))->toBe($catA1->id);

        $this->patchJson("/api/v1/modules/cfo/expense-categories/{$catA1->id}", [
            'company_id' => $companyB->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id']);

        $this->patchJson("/api/v1/modules/cfo/expense-types/{$typeA1->id}", [
            'expense_category_id' => $catA2->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['expense_category_id']);

        // LIKE wildcard characters '%' and '_' match literally; whitespace-only search does not break
        $this->getJson('/api/v1/modules/cfo/companies?search='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $companyA->id);

        $this->getJson('/api/v1/modules/cfo/companies?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // ?active_company=1 filters CFO endpoints properly (pass header per-request, not sticky)
        $this->getJson('/api/v1/modules/cfo/company-assets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Deleting a company soft-deletes its CompanyAsset records and clears CompanyAssetService cache
        $this->postJson('/api/v1/active-company', ['company_id' => $companyA->id])->assertOk();
        $this->deleteJson("/api/v1/modules/cfo/companies/{$companyA->id}")->assertOk();

        $this->assertSoftDeleted('company_assets', ['id' => $asset->id]);
        expect(Cache::has(CompanyAssetService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(CompanyService::CACHE_KEY_LIST))->toBeFalse();
        $this->getJson('/api/v1/modules/cfo/company-assets')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/active-company')->assertOk()->assertJsonPath('data', null);
    });

    it('enforces CHO speed and data correctness edge cases across all 5 CHO endpoints', function () {
        $companyA = Company::factory()->create(['name' => 'PT. CHO Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. CHO Beta']);

        $positionA = EmployeePosition::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'QA_100%',
            'name' => 'Analis 100% Pangan',
        ]);
        $statusA = EmploymentStatus::factory()->create(['company_id' => $companyA->id, 'name' => 'Tetap']);
        $gradeA = PayrollGrade::factory()->create([
            'company_id' => $companyA->id,
            'grade' => 2,
            'sub_grade' => 'A',
            'level_label' => 'Supervisor',
        ]);
        $taxA = TaxStatus::factory()->create(['company_id' => $companyA->id, 'code' => 'TK/0']);

        $positionB = EmployeePosition::factory()->create(['company_id' => $companyB->id]);

        $employees = Employee::factory()->count(5)->create([
            'company_id' => $companyA->id,
            'employee_position_id' => $positionA->id,
            'employment_status_id' => $statusA->id,
            'payroll_grade_id' => $gradeA->id,
            'tax_status_id' => $taxA->id,
        ]);

        foreach ($employees as $employee) {
            EmployeeDocument::factory()->create(['employee_id' => $employee->id]);
        }

        // 1. Pagination cap on CHO endpoints
        $this->getJson('/api/v1/modules/cho/employees?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count for /cho/employees (5 rows, 6 eager relations) has zero N+1
        Cache::flush();
        $this->postJson('/api/v1/active-company', ['company_id' => $companyB->id])->assertOk();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cho/employees')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 employees + 6 eager loads (company, position, status, grade, tax, documents) = 7 queries
        expect($coldQueries->count())->toBeLessThanOrEqual(8);

        // Warm cache hits execute 0 SQL queries
        $this->getJson('/api/v1/modules/cho/payroll-grades')->assertOk();
        $this->getJson('/api/v1/modules/cho/employee-positions')->assertOk();
        $this->getJson('/api/v1/modules/cho/payroll-runs')->assertOk();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cho/employees')->assertOk();
        $this->getJson('/api/v1/modules/cho/payroll-grades')->assertOk();
        $this->getJson('/api/v1/modules/cho/employee-positions')->assertOk();
        $this->getJson('/api/v1/modules/cho/payroll-runs')->assertOk();
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 3. Updating master data invalidates EmployeeService cache
        expect(Cache::has(EmployeeService::CACHE_KEY_LIST))->toBeTrue();
        $this->patchJson("/api/v1/modules/cho/payroll-grades/{$gradeA->id}", [
            'level_label' => 'Supervisor Senior',
        ])->assertOk();
        expect(Cache::has(EmployeeService::CACHE_KEY_LIST))->toBeFalse();

        // Warm again and test EmploymentStatus + TaxStatus invalidation
        $this->getJson('/api/v1/modules/cho/employees')->assertOk();
        $this->patchJson("/api/v1/modules/cho/employment-statuses/{$statusA->id}", ['name' => 'Pegawai Tetap'])->assertOk();
        expect(Cache::has(EmployeeService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cho/employees')->assertOk();
        $this->patchJson("/api/v1/modules/cho/tax-statuses/{$taxA->id}", ['name' => 'TK/0 Revisi'])->assertOk();
        expect(Cache::has(EmployeeService::CACHE_KEY_LIST))->toBeFalse();

        // 4. ?active_company=1 filters ALL 5 CHO endpoints
        foreach ([
            '/api/v1/modules/cho/employee-positions?active_company=1',
            '/api/v1/modules/cho/employment-statuses?active_company=1',
            '/api/v1/modules/cho/payroll-grades?active_company=1',
            '/api/v1/modules/cho/tax-statuses?active_company=1',
            '/api/v1/modules/cho/employees?active_company=1',
        ] as $endpoint) {
            $expectedCount = str_contains($endpoint, 'employee-positions') ? 1 : 0;
            $this->getJson($endpoint, ['X-Active-Company-Id' => (string) $companyB->id])
                ->assertOk()
                ->assertJsonCount($expectedCount, 'data');
        }

        // 5. Reassigning company_id on master records or employees while referenced fails with 422
        $this->patchJson("/api/v1/modules/cho/employee-positions/{$positionA->id}", ['company_id' => $companyB->id])
            ->assertUnprocessable()->assertJsonValidationErrors(['company_id']);
        $this->patchJson("/api/v1/modules/cho/employment-statuses/{$statusA->id}", ['company_id' => $companyB->id])
            ->assertUnprocessable()->assertJsonValidationErrors(['company_id']);
        $this->patchJson("/api/v1/modules/cho/payroll-grades/{$gradeA->id}", ['company_id' => $companyB->id])
            ->assertUnprocessable()->assertJsonValidationErrors(['company_id']);
        $this->patchJson("/api/v1/modules/cho/tax-statuses/{$taxA->id}", ['company_id' => $companyB->id])
            ->assertUnprocessable()->assertJsonValidationErrors(['company_id']);

        // PATCH changing Employee company_id without updating company-scoped FKs fails with 422
        $targetEmployee = $employees->first();
        $this->patchJson("/api/v1/modules/cho/employees/{$targetEmployee->id}", [
            'company_id' => $companyB->id,
            'employee_position_id' => $positionB->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['employment_status_id']);

        // 6. Deleting an Employee referenced by active attendance fails with 422
        $attendance = EmployeeAttendance::factory()->create([
            'company_id' => $companyA->id,
            'employee_id' => $targetEmployee->id,
        ]);
        $this->deleteJson("/api/v1/modules/cho/employees/{$targetEmployee->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['employee']);
        $attendance->delete();

        // 7. PayrollGrade numeric bounds & decimal:0,2 return 422 (not 500)
        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $companyA->id,
            'grade' => 9,
            'sub_grade' => 'Z',
            'base_salary' => 5000000.123,
        ])->assertUnprocessable()->assertJsonValidationErrors(['base_salary']);

        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $companyA->id,
            'grade' => 9,
            'sub_grade' => 'Z',
            'base_salary' => 9999999999999999.00,
        ])->assertUnprocessable()->assertJsonValidationErrors(['base_salary']);

        // 8. LIKE wildcards & whitespace-only search on CHO
        $this->getJson('/api/v1/modules/cho/employee-positions?filter[search]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $positionA->id);

        $this->getJson('/api/v1/modules/cho/employee-positions?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // 9. PayrollRun pagination cap & zero-N+1 cold-cache query bound
        PayrollRun::factory()->count(5)->create(['company_id' => $companyA->id]);
        Cache::flush();

        $this->getJson('/api/v1/modules/cho/payroll-runs?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cho/payroll-runs')->assertOk()->assertJsonCount(5, 'data');
        $payrollRunColdQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        expect($payrollRunColdQueries->count())->toBeLessThanOrEqual(3);
        expect($payrollRunColdQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 10. PayrollItem pagination cap, warm cache 0-query hit, and zero-N+1 cold-cache query bound
        $runForItems = PayrollRun::query()->where('company_id', $companyA->id)->firstOrFail();
        foreach ($employees as $emp) {
            PayrollItem::factory()->create([
                'company_id' => $companyA->id,
                'payroll_run_id' => $runForItems->id,
                'employee_id' => $emp->id,
                'employee_position_id' => $positionA->id,
            ]);
        }

        $this->getJson('/api/v1/modules/cho/payroll-items?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cho/payroll-items')->assertOk()->assertJsonCount(5, 'data');
        $payrollItemColdQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 payroll_items + 4 eager loads (company, payrollRun, employee, employeePosition) <= 6 queries, no SUM()
        expect($payrollItemColdQueries->count())->toBeLessThanOrEqual(6);
        expect($payrollItemColdQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cho/payroll-items')->assertOk()->assertJsonCount(5, 'data');
        $payrollItemWarmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($payrollItemWarmQueries)->toHaveCount(0);
    });

    it('enforces system-wide anti-duplication guardrails across schema, models, requests, services, and idempotency middleware', function () {
        $schemaSql = File::get(database_path('schema/mysql-schema.sql'));

        // 1. Any soft-deletable table in mysql-schema.sql with a UNIQUE KEY must use active_flag (never raw deleted_at)
        preg_match_all('/CREATE TABLE `([^`]+)` \((.*?)\) ENGINE=/s', $schemaSql, $allTables, PREG_SET_ORDER);
        expect($allTables)->not->toBeEmpty();

        foreach ($allTables as $match) {
            [, $tableName, $tableSql] = $match;
            if (! str_contains($tableSql, '`deleted_at`')) {
                continue;
            }

            preg_match_all('/UNIQUE KEY `[^`]+` \(([^)]+)\)/', $tableSql, $uniqueKeys);
            foreach ($uniqueKeys[1] as $cols) {
                expect(str_contains($cols, '`deleted_at`'))
                    ->toBeFalse("Table {$tableName} must not put deleted_at in UNIQUE KEY ({$cols}); use active_flag.");
                expect(str_contains($cols, '`active_flag`'))
                    ->toBeTrue("Soft-deletable table {$tableName} UNIQUE KEY ({$cols}) must include active_flag.");
            }
        }

        // 2. All natural-key soft-deletable tables must have active_flag + _active_unique, and models must hide active_flag
        $uniqueEntityMap = [
            'companies' => Company::class,
            'capital_companies' => CapitalCompany::class,
            'expense_categories' => ExpenseCategory::class,
            'expense_types' => ExpenseType::class,
            'lab_samples' => LabSample::class,
            'employee_positions' => EmployeePosition::class,
            'employment_statuses' => EmploymentStatus::class,
            'payroll_grades' => PayrollGrade::class,
            'tax_statuses' => TaxStatus::class,
            'employees' => Employee::class,
            'employee_documents' => EmployeeDocument::class,
            'employee_shifts' => EmployeeShift::class,
            'employee_shift_assignments' => EmployeeShiftAssignment::class,
            'employee_attendances' => EmployeeAttendance::class,
            'payroll_runs' => PayrollRun::class,
            'payroll_items' => PayrollItem::class,
        ];

        foreach ($uniqueEntityMap as $table => $modelClass) {
            preg_match("/CREATE TABLE `{$table}` \\((.*?)\\) ENGINE=/s", $schemaSql, $matches);
            expect($matches)->toHaveCount(2, "Table {$table} missing from mysql-schema.sql");
            $tableSql = $matches[1];

            expect($tableSql)
                ->toContain('`active_flag`')
                ->toContain('_active_unique`');

            $model = new $modelClass();
            expect(in_array('active_flag', $model->getHidden(), true))
                ->toBeTrue("{$modelClass} must hide active_flag from serialization.");
        }

        // 3. Unique-entity FormRequests must normalize input and validate uniqueness
        $uniqueRequests = [
            'Modules/CFO/Requests/SaveCompanyRequest.php',
            'Modules/CFO/Requests/SaveCapitalCompanyRequest.php',
            'Modules/CFO/Requests/SaveExpenseCategoryRequest.php',
            'Modules/CFO/Requests/SaveExpenseTypeRequest.php',
            'Http/Requests/StoreLabSampleRequest.php',
            'Modules/CHO/Requests/SaveEmployeePositionRequest.php',
            'Modules/CHO/Requests/SaveEmploymentStatusRequest.php',
            'Modules/CHO/Requests/SavePayrollGradeRequest.php',
            'Modules/CHO/Requests/SaveTaxStatusRequest.php',
            'Modules/CHO/Requests/SaveEmployeeRequest.php',
            'Modules/CHO/Requests/SavePayrollRunRequest.php',
            'Modules/CHO/Requests/SavePayrollItemRequest.php',
            'Modules/HR/Requests/SaveEmployeeShiftRequest.php',
            'Modules/HR/Requests/SaveEmployeeAttendanceRequest.php',
        ];

        foreach ($uniqueRequests as $requestPath) {
            $code = File::get(app_path($requestPath));
            expect(str_contains($code, 'prepareForValidation'))
                ->toBeTrue("{$requestPath} must normalize inputs in prepareForValidation().");
            $hasUniquenessCheck = str_contains($code, 'WriteGuard::')
                || str_contains($code, 'Rule::unique')
                || str_contains($code, 'duplicate');
            expect($hasUniquenessCheck)->toBeTrue("{$requestPath} must validate active uniqueness.");
        }

        // 4. Corresponding Services/Actions must re-check active uniqueness inside DB::transaction with sharedLock
        $lockedWriteGuards = [
            'Modules/CFO/Services/CompanyService.php',
            'Modules/CFO/Services/CapitalCompanyService.php',
            'Modules/CFO/Services/ExpenseCategoryService.php',
            'Modules/CFO/Services/ExpenseTypeService.php',
            'Services/LabSampleService.php',
            'Modules/CHO/Services/EmployeePositionService.php',
            'Modules/CHO/Services/EmploymentStatusService.php',
            'Modules/CHO/Services/PayrollGradeService.php',
            'Modules/CHO/Services/TaxStatusService.php',
            'Modules/CHO/Services/PayrollRunService.php',
            'Modules/CHO/Services/PayrollItemService.php',
            'Modules/CHO/Actions/AssertEmployeeContextAction.php',
            'Modules/HR/Services/EmployeeShiftService.php',
            'Modules/HR/Actions/RecordAttendanceAction.php',
        ];

        foreach ($lockedWriteGuards as $guardPath) {
            $code = File::get(app_path($guardPath));
            $hasTxUniqueLock = str_contains($code, 'WriteGuard::assertUniqueActive(')
                || str_contains($code, 'WriteGuard::assertCompanyCodeAndNameUnique(')
                || str_contains($code, '->sharedLock()');
            expect($hasTxUniqueLock)->toBeTrue("{$guardPath} must verify active uniqueness with sharedLock inside DB::transaction.");
        }

        // CHO master dictionaries with optional code must enforce BOTH code and name active uniqueness
        foreach (['employee_positions', 'employment_statuses', 'tax_statuses'] as $choMasterTable) {
            preg_match("/CREATE TABLE `{$choMasterTable}` \\((.*?)\\) ENGINE=/s", $schemaSql, $choMatch);
            expect($choMatch)->toHaveCount(2);
            expect(str_contains($choMatch[1], "{$choMasterTable}_company_code_active_unique"))
                ->toBeTrue("{$choMasterTable} must enforce active code uniqueness.");
            expect(str_contains($choMatch[1], "{$choMasterTable}_company_name_active_unique"))
                ->toBeTrue("{$choMasterTable} must enforce active name uniqueness even when code is null.");
        }

        // 5. Runtime duplicate protection (exact, whitespace-padded, case-variant, DB unique key, and re-create after delete)
        $companyRes = $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => '  PT.   Anti   Duplikat  ',
            'series' => 1,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'PT. Anti Duplikat')
            ->assertJsonMissingPath('data.active_flag');

        $companyId = $companyRes->json('data.id');

        $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => 'pt. anti   duplikat',
            'series' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Different series is allowed; partial PATCH colliding with existing (name, series) is blocked
        $series2 = $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => 'PT. Anti Duplikat',
            'series' => 2,
        ])->assertCreated();

        $this->patchJson('/api/v1/modules/cfo/companies/'.$series2->json('data.id'), [
            'series' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Direct DB bypass hits active_flag unique index
        expect(fn () => Company::factory()->create([
            'name' => 'PT. Anti Duplikat',
            'series' => 1,
        ]))->toThrow(QueryException::class);

        // Service-level sharedLock guards reject bypasses cleanly with ValidationException
        expect(fn () => app(CompanyService::class)->createCompany([
            'name' => 'PT. Anti Duplikat',
            'series' => 1,
        ]))->toThrow(ValidationException::class);

        $shift = EmployeeShift::factory()->create([
            'company_id' => $companyId,
            'code' => 'SHF-DUP',
        ]);
        expect(fn () => app(EmployeeShiftService::class)->createEmployeeShift([
            'company_id' => $companyId,
            'code' => 'shf-dup',
            'name' => 'Shift Bypass',
            'start_time' => '08:00',
            'end_time' => '17:00',
        ]))->toThrow(ValidationException::class);
        $shift->delete();

        $employee = Employee::factory()->create(['company_id' => $companyId]);
        EmployeeAttendance::factory()->create([
            'company_id' => $companyId,
            'employee_id' => $employee->id,
            'attendance_date' => '2026-11-21',
        ]);
        expect(fn () => app(RecordAttendanceAction::class)->execute([
            'company_id' => $companyId,
            'employee_id' => $employee->id,
            'attendance_date' => '2026-11-21',
        ]))->toThrow(ValidationException::class);

        // 6. Optional Idempotency-Key prevents duplicate transactional POSTs on retries
        $cat = ExpenseCategory::factory()->create(['company_id' => $companyId, 'name' => 'Operasional']);
        $type = ExpenseType::factory()->create([
            'company_id' => $companyId,
            'expense_category_id' => $cat->id,
            'name' => 'Konsumsi',
        ]);

        $idempotencyHeaders = ['Idempotency-Key' => 'idem-expense-001'];
        $expensePayload = [
            'company_id' => $companyId,
            'expense_category_id' => $cat->id,
            'expense_type_id' => $type->id,
            'name' => 'Air Mineral Galon',
            'amount' => 50000,
            'purchased_on' => '2026-11-21',
        ];

        $firstPost = $this->postJson('/api/v1/modules/cfo/expense-items', $expensePayload, $idempotencyHeaders)
            ->assertCreated();
        $replayPost = $this->postJson('/api/v1/modules/cfo/expense-items', $expensePayload, $idempotencyHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(ExpenseItem::query()->where('company_id', $companyId)->count())->toBe(1);

        // Reusing the same Idempotency-Key with a different payload is rejected with 422
        $this->postJson('/api/v1/modules/cfo/expense-items', [
            ...$expensePayload,
            'amount' => 75000,
        ], $idempotencyHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        // 7. CHO anti-duplication guardrails (name uniqueness with null code, case/whitespace variants, DB unique key)
        $this->postJson('/api/v1/modules/cho/employee-positions', [
            'company_id' => $companyId,
            'name' => '  Analis   Kimia  ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Analis Kimia');

        $this->postJson('/api/v1/modules/cho/employee-positions', [
            'company_id' => $companyId,
            'name' => 'analis kimia',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'company_id' => $companyId,
            'name' => 'Karyawan Kontrak',
        ])->assertCreated();

        $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'company_id' => $companyId,
            'name' => '  karyawan   kontrak ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'company_id' => $companyId,
            'name' => 'TK / 0',
        ])->assertCreated();

        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'company_id' => $companyId,
            'name' => '  tk / 0 ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $companyId,
            'grade' => 1,
            'sub_grade' => '  A ',
            'base_salary' => 5000000,
        ])->assertCreated();

        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $companyId,
            'grade' => 1,
            'sub_grade' => 'a',
            'base_salary' => 5500000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['sub_grade']);

        expect(fn () => EmployeePosition::factory()->create([
            'company_id' => $companyId,
            'code' => 'UNIQUE-CODE-X',
            'name' => 'Analis Kimia',
        ]))->toThrow(QueryException::class);

        // 8. PayrollRun Idempotency-Key & service-level sharedLock guard
        $prHeaders = ['Idempotency-Key' => 'idem-payroll-run-001'];
        $prPayload = [
            'company_id' => $companyId,
            'code' => 'PR-GUARD-01',
            'name' => 'Payroll Guardrail 01',
            'period_date' => '2026-08-01',
        ];
        $firstPr = $this->postJson('/api/v1/modules/cho/payroll-runs', $prPayload, $prHeaders)->assertCreated();
        $replayPr = $this->postJson('/api/v1/modules/cho/payroll-runs', $prPayload, $prHeaders)->assertCreated();
        expect($replayPr->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPr->json('data.id'))->toBe($firstPr->json('data.id'));

        expect(fn () => app(PayrollRunService::class)->createPayrollRun([
            'company_id' => $companyId,
            'code' => 'pr-guard-01',
            'name' => 'Payroll Guardrail 02',
            'period_date' => '2026-09-01',
        ]))->toThrow(ValidationException::class);

        // 9. PayrollItem Idempotency-Key, service-level sharedLock guard, and DB active_flag unique key
        $draftRunId = $firstPr->json('data.id');
        $piHeaders = ['Idempotency-Key' => 'idem-payroll-item-001'];
        $piPayload = [
            'company_id' => $companyId,
            'payroll_run_id' => $draftRunId,
            'employee_id' => $employee->id,
            'base_salary' => 5000000,
        ];
        $firstPi = $this->postJson('/api/v1/modules/cho/payroll-items', $piPayload, $piHeaders)->assertCreated();
        $replayPi = $this->postJson('/api/v1/modules/cho/payroll-items', $piPayload, $piHeaders)->assertCreated();
        expect($replayPi->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPi->json('data.id'))->toBe($firstPi->json('data.id'));

        $this->postJson('/api/v1/modules/cho/payroll-items', [
            ...$piPayload,
            'base_salary' => 6000000,
        ], $piHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => app(PayrollItemService::class)->createPayrollItem([
            'company_id' => $companyId,
            'payroll_run_id' => $draftRunId,
            'employee_id' => $employee->id,
            'base_salary' => 5000000,
        ]))->toThrow(ValidationException::class);

        expect(fn () => PayrollItem::factory()->create([
            'company_id' => $companyId,
            'payroll_run_id' => $draftRunId,
            'employee_id' => $employee->id,
        ]))->toThrow(QueryException::class);
    });
});
