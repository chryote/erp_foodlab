<?php

use App\Http\Controllers\Concerns\RespondsWithApiList;
use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\CompanyAsset;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Modules\CFO\Services\CompanyAssetService;
use App\Modules\CFO\Services\CompanyService;
use App\Support\ActiveCompany;
use App\Support\IndexQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

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

    it('bans known CFO speed and correctness anti-patterns in services, requests, and mysql schema', function () {
        expect(IndexQuery::MAX_PER_PAGE)->toBeLessThanOrEqual(100);

        $cfoServices = File::glob(app_path('Modules/CFO/Services/*Service.php'));
        foreach ($cfoServices as $servicePath) {
            $contents = File::get($servicePath);
            if (! str_contains($contents, 'CACHE_KEY_LIST')) {
                continue;
            }

            expect($contents)
                ->toContain('IndexQuery::applyActiveCompanyFilter(')
                ->toContain('IndexQuery::escapeLike(')
                ->not->toMatch('/->(?:or)?[wW]here\(\s*[\'"](?:capital|amount|price_per_unit|total_price)[\'"]\s*,\s*[\'"]like[\'"]/');
        }

        $companyService = File::get(app_path('Modules/CFO/Services/CompanyService.php'));
        expect($companyService)
            ->toContain('companyAssets()->delete()')
            ->toContain('CompanyAssetService::CACHE_KEY_LIST');

        foreach (['SaveCapitalCompanyRequest.php', 'SaveCompanyAssetRequest.php', 'SaveExpenseItemRequest.php'] as $requestFile) {
            $requestCode = File::get(app_path('Modules/CFO/Requests/'.$requestFile));
            expect($requestCode)
                ->toContain("isMethod('PATCH')")
                ->toContain('decimal:0,2')
                ->toContain('9999999999999999.99');
        }

        $schemaSql = File::get(database_path('schema/mysql-schema.sql'));
        foreach (['capital_companies', 'company_assets', 'expense_categories', 'expense_types', 'expense_items'] as $table) {
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
});
