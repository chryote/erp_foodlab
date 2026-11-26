<?php

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\CompanyAsset;
use App\Models\DefaultPackage;
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
use App\Models\Ingredient;
use App\Models\Item;
use App\Models\ItemPacket;
use App\Models\LabSample;
use App\Models\Packet;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Models\PacketVendor;
use App\Models\PayrollGrade;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\TaxStatus;
use App\Modules\CFO\Services\CompanyAssetService;
use App\Modules\CFO\Services\CompanyService;
use App\Modules\CHO\Services\EmployeeService;
use App\Modules\CHO\Services\PayrollItemService;
use App\Modules\CHO\Services\PayrollRunService;
use App\Modules\CPO\Services\DefaultPackageService;
use App\Modules\CPO\Services\IngredientService;
use App\Modules\CPO\Services\ItemPacketService;
use App\Modules\CPO\Services\ItemService;
use App\Modules\CPO\Services\PacketCategoryService;
use App\Modules\CPO\Services\PacketNameService;
use App\Modules\CPO\Services\PacketService;
use App\Modules\CPO\Services\PacketVendorService;
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

        $companyAgnosticMasterServices = [
            'EmployeePositionService.php',
            'EmploymentStatusService.php',
            'PayrollGradeService.php',
            'TaxStatusService.php',
        ];

        foreach ($guardedServices as $servicePath) {
            $contents = File::get($servicePath);
            if (! str_contains($contents, 'CACHE_KEY_LIST')) {
                continue;
            }

            if (! in_array(basename($servicePath), $companyAgnosticMasterServices, true)) {
                expect($contents)->toContain('IndexQuery::applyActiveCompanyFilter(');
            } else {
                expect($contents)->not->toContain('IndexQuery::applyActiveCompanyFilter(');
            }

            expect($contents)
                ->toContain('IndexQuery::escapeLike(')
                ->not->toMatch('/->(?:or)?[wW]here\(\s*[\'"](?:capital|amount|price_per_unit|total_price|grade|base_salary|position_allowance|total_gross|total_company_cost|net_employee_received|bpjs_kesehatan|bpjs_ketenagakerjaan|bonus|overtime|deduction|thr|pph21|total_net)[\'"]\s*,\s*[\'"]like[\'"]/');
        }

        $companyService = File::get(app_path('Modules/CFO/Services/CompanyService.php'));
        expect($companyService)
            ->toContain('companyAssets()->delete()')
            ->toContain('CompanyAssetService::CACHE_KEY_LIST')
            ->toContain('items()->delete()')
            ->toContain('itemPackets()->delete()');

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
            'code' => 'QA_100%',
            'name' => 'Analis 100% Pangan',
        ]);
        $statusA = EmploymentStatus::factory()->create(['name' => 'Tetap']);
        $gradeA = PayrollGrade::factory()->create([
            'grade' => 2,
            'sub_grade' => 'A',
            'level_label' => 'Supervisor',
        ]);
        $taxA = TaxStatus::factory()->create(['code' => 'TK/0']);

        $positionB = EmployeePosition::factory()->create();

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

        // 4. ?active_company=1 filters employees while company-agnostic master endpoints return all records for every company
        $this->getJson('/api/v1/modules/cho/employees?active_company=1', ['X-Active-Company-Id' => (string) $companyB->id])
            ->assertOk()
            ->assertJsonCount(0, 'data');

        foreach ([
            '/api/v1/modules/cho/employee-positions?active_company=1' => 2,
            '/api/v1/modules/cho/employment-statuses?active_company=1' => 1,
            '/api/v1/modules/cho/payroll-grades?active_company=1' => 1,
            '/api/v1/modules/cho/tax-statuses?active_company=1' => 1,
        ] as $endpoint => $expectedCount) {
            $this->getJson($endpoint, ['X-Active-Company-Id' => (string) $companyB->id])
                ->assertOk()
                ->assertJsonCount($expectedCount, 'data');
        }

        // 5. Employees in any company can use company-agnostic master records, and moving an employee with active attendance fails with 422
        $targetEmployee = $employees->first();
        $employeeB = Employee::factory()->create([
            'company_id' => $companyB->id,
            'employee_position_id' => $positionA->id,
            'employment_status_id' => $statusA->id,
            'payroll_grade_id' => $gradeA->id,
            'tax_status_id' => $taxA->id,
        ]);
        expect($employeeB->company_id)->toBe($companyB->id);

        // 6. Deleting an Employee referenced by active attendance fails with 422, and changing its company_id fails with 422
        $attendance = EmployeeAttendance::factory()->create([
            'company_id' => $companyA->id,
            'employee_id' => $targetEmployee->id,
        ]);
        $this->patchJson("/api/v1/modules/cho/employees/{$targetEmployee->id}", [
            'company_id' => $companyB->id,
            'employee_position_id' => $positionB->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['company_id']);
        $this->deleteJson("/api/v1/modules/cho/employees/{$targetEmployee->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['employee']);
        $attendance->delete();

        // 7. PayrollGrade numeric bounds & decimal:0,2 return 422 (not 500)
        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'grade' => 9,
            'sub_grade' => 'Z',
            'base_salary' => 5000000.123,
        ])->assertUnprocessable()->assertJsonValidationErrors(['base_salary']);

        $this->postJson('/api/v1/modules/cho/payroll-grades', [
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
            'items' => Item::class,
            'packets' => Packet::class,
            'packet_categories' => PacketCategory::class,
            'packet_names' => PacketName::class,
            'packet_vendors' => PacketVendor::class,
            'item_packet' => ItemPacket::class,
            'default_packages' => DefaultPackage::class,
            'ingredients' => Ingredient::class,
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
            'Modules/CPO/Requests/SaveItemRequest.php',
            'Modules/CPO/Requests/SavePacketRequest.php',
            'Modules/CPO/Requests/SavePacketCategoryRequest.php',
            'Modules/CPO/Requests/SavePacketNameRequest.php',
            'Modules/CPO/Requests/SavePacketVendorRequest.php',
            'Modules/CPO/Requests/SaveItemPacketRequest.php',
            'Modules/CPO/Requests/SaveDefaultPackageRequest.php',
            'Modules/CPO/Requests/SaveIngredientRequest.php',
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
            'Modules/CPO/Services/ItemService.php',
            'Modules/CPO/Services/PacketService.php',
            'Modules/CPO/Services/PacketCategoryService.php',
            'Modules/CPO/Services/PacketNameService.php',
            'Modules/CPO/Services/PacketVendorService.php',
            'Modules/CPO/Services/ItemPacketService.php',
            'Modules/CPO/Services/DefaultPackageService.php',
            'Modules/CPO/Services/IngredientService.php',
        ];

        foreach ($lockedWriteGuards as $guardPath) {
            $code = File::get(app_path($guardPath));
            $hasTxUniqueLock = str_contains($code, 'WriteGuard::assertUniqueActive(')
                || str_contains($code, 'WriteGuard::assertCodeAndNameUnique(')
                || str_contains($code, 'WriteGuard::assertCompanyCodeAndNameUnique(')
                || str_contains($code, '->sharedLock()');
            expect($hasTxUniqueLock)->toBeTrue("{$guardPath} must verify active uniqueness with sharedLock inside DB::transaction.");
        }

        // CHO company-agnostic master dictionaries with optional code must enforce BOTH code and name active uniqueness
        foreach (['employee_positions', 'employment_statuses', 'tax_statuses'] as $choMasterTable) {
            preg_match("/CREATE TABLE `{$choMasterTable}` \\((.*?)\\) ENGINE=/s", $schemaSql, $choMatch);
            expect($choMatch)->toHaveCount(2);
            expect(str_contains($choMatch[1], '`company_id`'))
                ->toBeFalse("{$choMasterTable} must be company-agnostic without company_id.");
            expect(str_contains($choMatch[1], "{$choMasterTable}_code_active_unique"))
                ->toBeTrue("{$choMasterTable} must enforce active code uniqueness.");
            expect(str_contains($choMatch[1], "{$choMasterTable}_name_active_unique"))
                ->toBeTrue("{$choMasterTable} must enforce active name uniqueness even when code is null.");
        }

        preg_match('/CREATE TABLE `payroll_grades` \((.*?)\) ENGINE=/s', $schemaSql, $gradeMatch);
        expect($gradeMatch)->toHaveCount(2);
        expect(str_contains($gradeMatch[1], '`company_id`'))
            ->toBeFalse('payroll_grades must be company-agnostic without company_id.');
        expect(str_contains($gradeMatch[1], 'payroll_grades_grade_sub_active_unique'))
            ->toBeTrue('payroll_grades must enforce global active (grade, sub_grade) uniqueness.');

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
            'name' => '  Analis   Kimia  ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Analis Kimia');

        $this->postJson('/api/v1/modules/cho/employee-positions', [
            'name' => 'analis kimia',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'name' => 'Karyawan Kontrak',
        ])->assertCreated();

        $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'name' => '  karyawan   kontrak ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'name' => 'TK / 0',
        ])->assertCreated();

        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'name' => '  tk / 0 ',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'grade' => 1,
            'sub_grade' => '  A ',
            'base_salary' => 5000000,
        ])->assertCreated();

        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'grade' => 1,
            'sub_grade' => 'a',
            'base_salary' => 5500000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['sub_grade']);

        expect(fn () => EmployeePosition::factory()->create([
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

    it('enforces CPO Items speed, cache, pagination, and anti-duplication guardrails', function () {
        $companyA = Company::factory()->create(['name' => 'PT. CPO Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. CPO Beta']);

        Item::factory()->count(4)->create(['company_id' => $companyA->id]);
        $specialItem = Item::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'ITM-100%',
            'name' => 'Gula 100% Murni',
            'type' => 'Bahan',
        ]);

        // 1. Pagination cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cpo/items?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count is bounded (no N+1, no SUM())
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 items select + 1 companies eager load = <= 2 queries
        expect($coldQueries->count())->toBeLessThanOrEqual(2);
        expect($coldQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 3. Warm cache hit executes 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk()->assertJsonCount(5, 'data');
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 4. Tenant-scoped ?active_company=1 filters items to the active company
        $this->getJson('/api/v1/modules/cpo/items?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        $this->getJson('/api/v1/modules/cpo/items?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(0, 'data');

        // 5. LIKE wildcard escaping & whitespace-only search
        $this->getJson('/api/v1/modules/cpo/items?filter[search]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specialItem->id);

        $this->getJson('/api/v1/modules/cpo/items?filter[name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        $this->getJson('/api/v1/modules/cpo/items?filter[code]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specialItem->id);

        $this->getJson('/api/v1/modules/cpo/items?filter[code]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        // 6. Direct DB bypass hits items_company_name_active_unique & items_company_code_active_unique, service sharedLock throws ValidationException, and Idempotency-Key deduplicates POSTs
        $idemHeaders = ['Idempotency-Key' => 'idem-cpo-item-001'];
        $itemPayload = [
            'company_id' => $companyA->id,
            'code' => '  ITM-TAP-01  ',
            'name' => '  Tepung   Tapioka  ',
            'type' => 'Bahan',
        ];

        $firstPost = $this->postJson('/api/v1/modules/cpo/items', $itemPayload, $idemHeaders)
            ->assertCreated()
            ->assertJsonPath('data.code', 'ITM-TAP-01')
            ->assertJsonPath('data.name', 'Tepung Tapioka')
            ->assertJsonMissingPath('data.active_flag');

        $replayPost = $this->postJson('/api/v1/modules/cpo/items', $itemPayload, $idemHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(Item::query()->where('company_id', $companyA->id)->where('name', 'Tepung Tapioka')->count())->toBe(1);

        $this->postJson('/api/v1/modules/cpo/items', [
            'company_id' => $companyA->id,
            'name' => 'Tepung Maizena',
            'type' => 'Bahan',
        ], $idemHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => Item::factory()->create([
            'company_id' => $companyA->id,
            'name' => 'Tepung Tapioka',
        ]))->toThrow(QueryException::class);

        expect(fn () => Item::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'ITM-TAP-01',
            'name' => 'Tepung Lain',
        ]))->toThrow(QueryException::class);

        expect(fn () => app(ItemService::class)->createItem([
            'company_id' => $companyA->id,
            'name' => 'tepung tapioka',
        ]))->toThrow(ValidationException::class);

        expect(fn () => app(ItemService::class)->createItem([
            'company_id' => $companyA->id,
            'code' => 'itm-tap-01',
            'name' => 'Tepung Beras',
        ]))->toThrow(ValidationException::class);

        // 7. PacketVendor-owned items enforce bounded mixed-owner queries, DB unique indexes, and Service-level XOR guardrails
        $vendor = PacketVendor::factory()->create(['name' => 'Vendor Guardrail Item']);
        $vendorItem = Item::factory()->forPacketVendor($vendor)->create([
            'code' => 'VND-GRD-01',
            'name' => 'Kemasan Guardrail',
        ]);

        Cache::flush();
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/items')->assertOk()->assertJsonCount(7, 'data');
        $mixedColdQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 items select + 1 companies eager load + 1 packet_vendors eager load = <= 3 queries
        expect($mixedColdQueries->count())->toBeLessThanOrEqual(3);

        expect(fn () => Item::factory()->create([
            'company_id' => null,
            'packet_vendor_id' => $vendor->id,
            'name' => 'Kemasan Guardrail',
        ]))->toThrow(QueryException::class);

        expect(fn () => Item::factory()->create([
            'company_id' => null,
            'packet_vendor_id' => $vendor->id,
            'code' => 'VND-GRD-01',
            'name' => 'Kemasan Lain',
        ]))->toThrow(QueryException::class);

        expect(fn () => app(ItemService::class)->createItem([
            'company_id' => $companyA->id,
            'packet_vendor_id' => $vendor->id,
            'name' => 'Invalid Dual Owner',
        ]))->toThrow(ValidationException::class);

        expect(fn () => app(ItemService::class)->createItem([
            'name' => 'Invalid Missing Owner',
        ]))->toThrow(ValidationException::class);

        expect(fn () => app(ItemService::class)->createItem([
            'packet_vendor_id' => $vendor->id,
            'name' => 'kemasan guardrail',
        ]))->toThrow(ValidationException::class);

        expect($vendorItem->company_id)->toBeNull();
    });

    it('enforces CPO Packets speed, cache, pagination, and anti-duplication guardrails', function () {
        $companyA = Company::factory()->create(['name' => 'PT. CPO Packet Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. CPO Packet Beta']);

        Packet::factory()->count(4)->create();
        $specialPacket = Packet::factory()->create(['name' => 'Paket 100% Organik']);

        // 1. Pagination cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cpo/packets?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count is bounded (no N+1, no SUM())
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/packets')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        expect($coldQueries->count())->toBeLessThanOrEqual(2);
        expect($coldQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 3. Warm cache hit executes 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/packets')->assertOk()->assertJsonCount(5, 'data');
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 4. Company-agnostic ?active_company=1 returns all packets regardless of active company header
        $this->getJson('/api/v1/modules/cpo/packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        $this->getJson('/api/v1/modules/cpo/packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        // 5. LIKE wildcard escaping & whitespace-only search
        $this->getJson('/api/v1/modules/cpo/packets?filter[search]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specialPacket->id);

        $this->getJson('/api/v1/modules/cpo/packets?filter[name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        // 6. Direct DB bypass hits packets_name_active_unique, service sharedLock throws ValidationException, and Idempotency-Key deduplicates POSTs
        $idemHeaders = ['Idempotency-Key' => 'idem-cpo-packet-001'];
        $packetPayload = ['name' => '  Paket   Sarapan  '];

        $firstPost = $this->postJson('/api/v1/modules/cpo/packets', $packetPayload, $idemHeaders)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Paket Sarapan')
            ->assertJsonMissingPath('data.active_flag');

        $replayPost = $this->postJson('/api/v1/modules/cpo/packets', $packetPayload, $idemHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(Packet::query()->where('name', 'Paket Sarapan')->count())->toBe(1);

        $this->postJson('/api/v1/modules/cpo/packets', [
            'name' => 'Paket Makan Siang',
        ], $idemHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => Packet::factory()->create([
            'name' => 'Paket Sarapan',
        ]))->toThrow(QueryException::class);

        expect(fn () => app(PacketService::class)->createPacket([
            'name' => 'paket sarapan',
        ]))->toThrow(ValidationException::class);
    });

    it('enforces CPO ItemPackets speed, cache, pagination, and anti-duplication guardrails', function () {
        $companyA = Company::factory()->create(['name' => 'PT. CPO Pivot Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. CPO Pivot Beta']);

        $packetA = Packet::factory()->create(['name' => 'Paket Pivot A']);
        $packetB = Packet::factory()->create(['name' => 'Paket Pivot B']);
        $items = Item::factory()->count(5)->create(['company_id' => $companyA->id]);

        foreach ($items as $index => $item) {
            ItemPacket::factory()->create([
                'company_id' => $companyA->id,
                'packet_id' => $index < 3 ? $packetA->id : $packetB->id,
                'item_id' => $item->id,
                'quantity' => $index + 1,
            ]);
        }

        // 1. Pagination cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cpo/item-packets?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count is bounded (no N+1, no SUM())
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 item_packet select + 3 eager loads (company, packet, item) = <= 4 queries
        expect($coldQueries->count())->toBeLessThanOrEqual(4);
        expect($coldQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 3. Warm cache hit executes 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk()->assertJsonCount(5, 'data');
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 4. Tenant-scoped ?active_company=1 filters item_packet rows to the active company
        $this->getJson('/api/v1/modules/cpo/item-packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        $this->getJson('/api/v1/modules/cpo/item-packets?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(0, 'data');

        // 5. Numeric range & exact filters work without LIKE
        $this->getJson('/api/v1/modules/cpo/item-packets?filter[quantity_min]=4&filter[quantity_max]=5')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/modules/cpo/item-packets?filter[packet_id]={$packetA->id}")
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // 6. Direct DB bypass hits item_packet_comp_packet_item_active_unique, service sharedLock throws ValidationException, and Idempotency-Key deduplicates POSTs
        $newItem = Item::factory()->create(['company_id' => $companyA->id, 'name' => 'Garam Dapur']);
        $idemHeaders = ['Idempotency-Key' => 'idem-cpo-item-packet-001'];
        $pivotPayload = [
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $newItem->id,
            'quantity' => 3,
        ];

        $firstPost = $this->postJson('/api/v1/modules/cpo/item-packets', $pivotPayload, $idemHeaders)
            ->assertCreated()
            ->assertJsonPath('data.quantity', 3)
            ->assertJsonMissingPath('data.active_flag');

        $replayPost = $this->postJson('/api/v1/modules/cpo/item-packets', $pivotPayload, $idemHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(ItemPacket::query()
            ->where('company_id', $companyA->id)
            ->where('packet_id', $packetA->id)
            ->where('item_id', $newItem->id)
            ->count())->toBe(1);

        $this->postJson('/api/v1/modules/cpo/item-packets', [
            ...$pivotPayload,
            'quantity' => 8,
        ], $idemHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => ItemPacket::factory()->create([
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $newItem->id,
            'quantity' => 1,
        ]))->toThrow(QueryException::class);

        expect(fn () => app(ItemPacketService::class)->createItemPacket([
            'company_id' => $companyA->id,
            'packet_id' => $packetA->id,
            'item_id' => $newItem->id,
            'quantity' => 2,
        ]))->toThrow(ValidationException::class);

        // 7. PacketVendor-owned ItemPackets enforce bounded mixed-owner queries, DB unique index, and Service-level XOR + cross-owner guardrails
        $vendor = PacketVendor::factory()->create(['name' => 'Vendor Guardrail Pivot']);
        $vendorItem = Item::factory()->forPacketVendor($vendor)->create(['name' => 'Vendor Guardrail Item']);
        ItemPacket::factory()->forPacketVendor($vendor)->create([
            'packet_id' => $packetA->id,
            'item_id' => $vendorItem->id,
            'quantity' => 2,
        ]);

        Cache::flush();
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/item-packets')->assertOk()->assertJsonCount(7, 'data');
        $mixedPivotQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 item_packet select + 4 eager loads (company, packetVendor, packet, item) = <= 5 queries
        expect($mixedPivotQueries->count())->toBeLessThanOrEqual(5);

        expect(fn () => ItemPacket::factory()->create([
            'company_id' => null,
            'packet_vendor_id' => $vendor->id,
            'packet_id' => $packetA->id,
            'item_id' => $vendorItem->id,
            'quantity' => 1,
        ]))->toThrow(QueryException::class);

        expect(fn () => app(ItemPacketService::class)->createItemPacket([
            'company_id' => $companyA->id,
            'packet_vendor_id' => $vendor->id,
            'packet_id' => $packetB->id,
            'item_id' => $vendorItem->id,
        ]))->toThrow(ValidationException::class);

        expect(fn () => app(ItemPacketService::class)->createItemPacket([
            'packet_vendor_id' => $vendor->id,
            'packet_id' => $packetB->id,
            'item_id' => $newItem->id,
        ]))->toThrow(ValidationException::class);
    });

    it('enforces CPO PacketNames speed, cache, pagination, and anti-duplication guardrails', function () {
        $companyA = Company::factory()->create(['name' => 'PT. CPO PacketName Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. CPO PacketName Beta']);

        PacketName::factory()->count(4)->create();
        $specialPacketName = PacketName::factory()->create(['name' => 'Paket Nama 100% Organik']);

        // 1. Pagination cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cpo/packet-names?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count is bounded (no N+1, no SUM())
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/packet-names')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        expect($coldQueries->count())->toBeLessThanOrEqual(2);
        expect($coldQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 3. Warm cache hit executes 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/packet-names')->assertOk()->assertJsonCount(5, 'data');
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 4. Company-agnostic ?active_company=1 returns all packet names regardless of active company header
        $this->getJson('/api/v1/modules/cpo/packet-names?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        $this->getJson('/api/v1/modules/cpo/packet-names?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        // 5. LIKE wildcard escaping & whitespace-only search
        $this->getJson('/api/v1/modules/cpo/packet-names?filter[search]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specialPacketName->id);

        $this->getJson('/api/v1/modules/cpo/packet-names?filter[name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        // 6. Direct DB bypass hits packet_names_name_active_unique, service sharedLock throws ValidationException, and Idempotency-Key deduplicates POSTs
        $idemHeaders = ['Idempotency-Key' => 'idem-cpo-packet-name-001'];
        $packetNamePayload = ['name' => '  Paket   Sarapan  '];

        $firstPost = $this->postJson('/api/v1/modules/cpo/packet-names', $packetNamePayload, $idemHeaders)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Paket Sarapan')
            ->assertJsonMissingPath('data.active_flag');

        $replayPost = $this->postJson('/api/v1/modules/cpo/packet-names', $packetNamePayload, $idemHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(PacketName::query()->where('name', 'Paket Sarapan')->count())->toBe(1);

        $this->postJson('/api/v1/modules/cpo/packet-names', [
            'name' => 'Paket Makan Siang',
        ], $idemHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => PacketName::factory()->create([
            'name' => 'Paket Sarapan',
        ]))->toThrow(QueryException::class);

        expect(fn () => app(PacketNameService::class)->createPacketName([
            'name' => 'paket sarapan',
        ]))->toThrow(ValidationException::class);
    });

    it('enforces CPO PacketVendors speed, cache, pagination, and anti-duplication guardrails', function () {
        $companyA = Company::factory()->create(['name' => 'PT. CPO PacketVendor Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. CPO PacketVendor Beta']);

        PacketVendor::factory()->count(4)->create();
        $specialPacketVendor = PacketVendor::factory()->create(['name' => 'Vendor 100% Organik']);

        // 1. Pagination cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cpo/packet-vendors?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count is bounded (no N+1, no SUM())
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/packet-vendors')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        expect($coldQueries->count())->toBeLessThanOrEqual(2);
        expect($coldQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 3. Warm cache hit executes 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/packet-vendors')->assertOk()->assertJsonCount(5, 'data');
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 4. Company-agnostic ?active_company=1 returns all packet vendors regardless of active company header
        $this->getJson('/api/v1/modules/cpo/packet-vendors?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        $this->getJson('/api/v1/modules/cpo/packet-vendors?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        // 5. LIKE wildcard escaping & whitespace-only search
        $this->getJson('/api/v1/modules/cpo/packet-vendors?filter[search]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specialPacketVendor->id);

        $this->getJson('/api/v1/modules/cpo/packet-vendors?filter[name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        // 6. Direct DB bypass hits packet_vendors_name_active_unique, service sharedLock throws ValidationException, and Idempotency-Key deduplicates POSTs
        $idemHeaders = ['Idempotency-Key' => 'idem-cpo-packet-vendor-001'];
        $packetVendorPayload = ['name' => '  Vendor   Nusantara  '];

        $firstPost = $this->postJson('/api/v1/modules/cpo/packet-vendors', $packetVendorPayload, $idemHeaders)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Vendor Nusantara')
            ->assertJsonMissingPath('data.active_flag');

        $replayPost = $this->postJson('/api/v1/modules/cpo/packet-vendors', $packetVendorPayload, $idemHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(PacketVendor::query()->where('name', 'Vendor Nusantara')->count())->toBe(1);

        $this->postJson('/api/v1/modules/cpo/packet-vendors', [
            'name' => 'Vendor Sejahtera',
        ], $idemHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => PacketVendor::factory()->create([
            'name' => 'Vendor Nusantara',
        ]))->toThrow(QueryException::class);

        expect(fn () => app(PacketVendorService::class)->createPacketVendor([
            'name' => 'vendor nusantara',
        ]))->toThrow(ValidationException::class);
    });

    it('enforces CPO PacketCategories speed, cache, pagination, and anti-duplication guardrails', function () {
        $companyA = Company::factory()->create(['name' => 'PT. CPO PacketCategory Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. CPO PacketCategory Beta']);

        PacketCategory::factory()->count(4)->create();
        $specialPacketCategory = PacketCategory::factory()->create(['name' => 'Kategori 100% Organik']);

        // 1. Pagination cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cpo/packet-categories?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count is bounded (no N+1, no SUM())
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/packet-categories')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        expect($coldQueries->count())->toBeLessThanOrEqual(2);
        expect($coldQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 3. Warm cache hit executes 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/packet-categories')->assertOk()->assertJsonCount(5, 'data');
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 4. Company-agnostic ?active_company=1 returns all packet categories regardless of active company header
        $this->getJson('/api/v1/modules/cpo/packet-categories?active_company=1', [
            'X-Active-Company-Id' => (string) $companyA->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        $this->getJson('/api/v1/modules/cpo/packet-categories?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])->assertOk()->assertJsonCount(5, 'data');

        // 5. LIKE wildcard escaping & whitespace-only search
        $this->getJson('/api/v1/modules/cpo/packet-categories?filter[search]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specialPacketCategory->id);

        $this->getJson('/api/v1/modules/cpo/packet-categories?filter[name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        // 6. Direct DB bypass hits packet_categories_name_active_unique, service sharedLock throws ValidationException, and Idempotency-Key deduplicates POSTs
        $idemHeaders = ['Idempotency-Key' => 'idem-cpo-packet-category-001'];
        $packetCategoryPayload = ['name' => '  Kategori   Nusantara  '];

        $firstPost = $this->postJson('/api/v1/modules/cpo/packet-categories', $packetCategoryPayload, $idemHeaders)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Kategori Nusantara')
            ->assertJsonMissingPath('data.active_flag');

        $replayPost = $this->postJson('/api/v1/modules/cpo/packet-categories', $packetCategoryPayload, $idemHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(PacketCategory::query()->where('name', 'Kategori Nusantara')->count())->toBe(1);

        $this->postJson('/api/v1/modules/cpo/packet-categories', [
            'name' => 'Kategori Sejahtera',
        ], $idemHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => PacketCategory::factory()->create([
            'name' => 'Kategori Nusantara',
        ]))->toThrow(QueryException::class);

        expect(fn () => app(PacketCategoryService::class)->createPacketCategory([
            'name' => 'kategori nusantara',
        ]))->toThrow(ValidationException::class);
    });

    it('enforces CPO DefaultPackages speed, cache, pagination, and anti-duplication guardrails', function () {
        $company = Company::factory()->create(['name' => 'PT. CPO DefaultPackage Alpha']);
        $packet = Packet::factory()->create(['name' => 'Paket Base DP']);
        $itemPacket = ItemPacket::factory()->create([
            'company_id' => $company->id,
            'packet_id' => $packet->id,
        ]);
        $packetName = PacketName::factory()->create(['name' => 'Nama Paket DP']);
        $packetVendor = PacketVendor::factory()->create(['name' => 'Vendor Paket DP']);
        $packetCategory = PacketCategory::factory()->create(['name' => 'Kategori Paket DP']);

        DefaultPackage::factory()->count(4)->create([
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
        ]);
        $specialDefaultPackage = DefaultPackage::factory()->create([
            'brand_name' => 'Brand 100% Murni',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 25000.50,
        ]);

        // 1. Pagination cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cpo/default-packages?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count is bounded (no N+1, no SUM())
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 default_packages select + 4 eager loads (packetName, packetVendor, packetCategory, itemPacket) = <= 5 queries
        expect($coldQueries->count())->toBeLessThanOrEqual(5);
        expect($coldQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 3. Warm cache hit executes 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/default-packages')->assertOk()->assertJsonCount(5, 'data');
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 4. Numeric range, LIKE wildcard escaping & whitespace-only search
        $this->getJson('/api/v1/modules/cpo/default-packages?filter[min_price]=25000&filter[max_price]=25001')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specialDefaultPackage->id);

        $this->getJson('/api/v1/modules/cpo/default-packages?filter[brand_name]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $specialDefaultPackage->id);

        $this->getJson('/api/v1/modules/cpo/default-packages?filter[brand_name]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(5, 'data');

        // 5. Direct DB bypass hits default_packages_brand_pkt_vend_cat_ip_active_unique, service sharedLock throws ValidationException, and Idempotency-Key deduplicates POSTs
        $idemHeaders = ['Idempotency-Key' => 'idem-cpo-default-package-001'];
        $dpPayload = [
            'brand_name' => '  Brand   Nusantara  ',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 15000,
        ];

        $firstPost = $this->postJson('/api/v1/modules/cpo/default-packages', $dpPayload, $idemHeaders)
            ->assertCreated()
            ->assertJsonPath('data.brand_name', 'Brand Nusantara')
            ->assertJsonPath('data.price', 15000)
            ->assertJsonMissingPath('data.active_flag');

        $replayPost = $this->postJson('/api/v1/modules/cpo/default-packages', $dpPayload, $idemHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(DefaultPackage::query()->where('brand_name', 'Brand Nusantara')->count())->toBe(1);

        $this->postJson('/api/v1/modules/cpo/default-packages', [
            ...$dpPayload,
            'brand_name' => 'Brand Lain',
        ], $idemHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => DefaultPackage::factory()->create([
            'brand_name' => 'Brand Nusantara',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
        ]))->toThrow(QueryException::class);

        expect(fn () => app(DefaultPackageService::class)->createDefaultPackage([
            'brand_name' => 'brand nusantara',
            'packet_name_id' => $packetName->id,
            'packet_vendor_id' => $packetVendor->id,
            'packet_category_id' => $packetCategory->id,
            'item_packet_id' => $itemPacket->id,
            'price' => 15000,
        ]))->toThrow(ValidationException::class);
    });

    it('enforces CPO Ingredients speed, cache, pagination, and anti-duplication guardrails', function () {
        $company = Company::factory()->create(['name' => 'PT. CPO Ingredient Alpha']);
        $defaultPackage = DefaultPackage::factory()->create(['brand_name' => 'Paket Ingredient DP']);
        $items = Item::factory()->count(5)->create(['company_id' => $company->id]);

        foreach ($items as $index => $item) {
            Ingredient::factory()->create([
                'default_package_id' => $defaultPackage->id,
                'item_id' => $item->id,
                'price' => ($index + 1) * 5000,
            ]);
        }

        // 1. Pagination cap prevents unbounded ?per_page=99999 dumps
        $this->getJson('/api/v1/modules/cpo/ingredients?page=1&per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', IndexQuery::MAX_PER_PAGE);

        // 2. Cold-cache query count is bounded (no N+1, no SUM())
        Cache::flush();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk()->assertJsonCount(5, 'data');
        $coldQueries = collect(DB::getQueryLog())
            ->reject(fn ($q) => str_contains($q['query'], 'personal_access_tokens'));
        DB::disableQueryLog();

        // 1 ingredients select + 2 eager loads (defaultPackage, item) = <= 3 queries
        expect($coldQueries->count())->toBeLessThanOrEqual(3);
        expect($coldQueries->contains(fn ($q) => str_contains(strtoupper($q['query']), 'SUM(')))->toBeFalse();

        // 3. Warm cache hit executes 0 SQL queries
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/modules/cpo/ingredients')->assertOk()->assertJsonCount(5, 'data');
        $warmQueries = DB::getQueryLog();
        DB::disableQueryLog();

        expect($warmQueries)->toHaveCount(0);

        // 4. Numeric range & exact filters work without LIKE
        $this->getJson('/api/v1/modules/cpo/ingredients?filter[min_price]=15000&filter[max_price]=20000')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/modules/cpo/ingredients?filter[default_package_id]={$defaultPackage->id}")
            ->assertOk()
            ->assertJsonCount(5, 'data');

        // 5. Direct DB bypass hits ingredients_pkg_item_active_unique, service sharedLock throws ValidationException, and Idempotency-Key deduplicates POSTs
        $newItem = Item::factory()->create(['company_id' => $company->id, 'name' => 'Garam Ingredient']);
        $idemHeaders = ['Idempotency-Key' => 'idem-cpo-ingredient-001'];
        $ingredientPayload = [
            'default_package_id' => $defaultPackage->id,
            'item_id' => $newItem->id,
            'price' => 12500,
        ];

        $firstPost = $this->postJson('/api/v1/modules/cpo/ingredients', $ingredientPayload, $idemHeaders)
            ->assertCreated()
            ->assertJsonPath('data.price', 12500)
            ->assertJsonMissingPath('data.active_flag');

        $replayPost = $this->postJson('/api/v1/modules/cpo/ingredients', $ingredientPayload, $idemHeaders)
            ->assertCreated();

        expect($replayPost->headers->get('X-Idempotency-Replayed'))->toBe('true');
        expect($replayPost->json('data.id'))->toBe($firstPost->json('data.id'));
        expect(Ingredient::query()
            ->where('default_package_id', $defaultPackage->id)
            ->where('item_id', $newItem->id)
            ->count())->toBe(1);

        $this->postJson('/api/v1/modules/cpo/ingredients', [
            ...$ingredientPayload,
            'price' => 19000,
        ], $idemHeaders)->assertUnprocessable()->assertJsonValidationErrors(['idempotency_key']);

        expect(fn () => Ingredient::factory()->create([
            'default_package_id' => $defaultPackage->id,
            'item_id' => $newItem->id,
            'price' => 9999,
        ]))->toThrow(QueryException::class);

        expect(fn () => app(IngredientService::class)->createIngredient([
            'default_package_id' => $defaultPackage->id,
            'item_id' => $newItem->id,
            'price' => 9999,
        ]))->toThrow(ValidationException::class);
    });
});
