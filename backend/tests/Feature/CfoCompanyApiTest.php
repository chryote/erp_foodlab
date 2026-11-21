<?php

use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\CompanyAsset;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Modules\CFO\Services\CompanyService;
use Illuminate\Support\Facades\Cache;

describe('CFO Company CRUD API (/api/v1/modules/cfo/companies)', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('lists companies and caches results', function () {
        Company::factory()->count(2)->create();

        expect(Cache::has(CompanyService::CACHE_KEY_LIST))->toBeFalse();

        $response = $this->getJson('/api/v1/modules/cfo/companies');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.cache_key', CompanyService::CACHE_KEY_LIST);

        expect(Cache::has(CompanyService::CACHE_KEY_LIST))->toBeTrue();
    });

    it('filters and paginates companies by name', function () {
        Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);
        Company::factory()->create([
            'name' => 'PT. Agro Pangan Sejahtera',
        ]);
        Company::factory()->create([
            'name' => 'PT. Dairy Nusantara',
        ]);

        $filtered = $this->getJson('/api/v1/modules/cfo/companies?search=Agro');
        $filtered->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'PT. Agro Pangan Sejahtera');

        $paginated = $this->getJson('/api/v1/modules/cfo/companies?page=1&per_page=2');
        $paginated->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.last_page', 2);
    });

    it('creates, updates, and soft-deletes a company', function () {
        $createRes = $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => 'PT. Slaras Nusa Foodlab',
            'series' => 2,
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.name', 'PT. Slaras Nusa Foodlab')
            ->assertJsonPath('data.series', 2);

        $companyId = $createRes->json('data.id');
        $this->assertDatabaseHas('companies', [
            'id' => $companyId,
            'name' => 'PT. Slaras Nusa Foodlab',
            'series' => 2,
        ]);

        $updateRes = $this->putJson("/api/v1/modules/cfo/companies/{$companyId}", [
            'name' => 'PT. Slaras Nusa Foodlab Internasional',
            'series' => 3,
        ]);

        $updateRes->assertOk()
            ->assertJsonPath('data.name', 'PT. Slaras Nusa Foodlab Internasional')
            ->assertJsonPath('data.series', 3);

        $deleteRes = $this->deleteJson("/api/v1/modules/cfo/companies/{$companyId}");
        $deleteRes->assertOk();

        $this->assertSoftDeleted('companies', ['id' => $companyId]);

        $listRes = $this->getJson('/api/v1/modules/cfo/companies');
        $listRes->assertOk()->assertJsonCount(0, 'data');
    });

    it('validates company name and series when creating or updating', function () {
        $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => '',
            'series' => 0,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'series']);
    });

    it('supports QueryBuilder filters, sorts, and includes', function () {
        $company = Company::factory()->create([
            'name' => 'PT. Beta',
            'series' => 2,
        ]);
        Company::factory()->create([
            'name' => 'PT. Alpha',
            'series' => 1,
        ]);
        CapitalCompany::factory()->create([
            'company_id' => $company->id,
            'stakeholder_name' => 'Rian',
        ]);

        $this->getJson('/api/v1/modules/cfo/companies?filter[series]=2&sort=name&include=capitalCompanies')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'PT. Beta')
            ->assertJsonPath('data.0.capital_companies.0.stakeholder_name', 'Rian');
    });

    it('soft-deletes dependent financial records when a company is deleted', function () {
        $company = Company::factory()->create();
        $capital = CapitalCompany::factory()->create(['company_id' => $company->id]);
        $asset = CompanyAsset::factory()->create(['company_id' => $company->id]);
        $category = ExpenseCategory::factory()->create(['company_id' => $company->id]);
        $type = ExpenseType::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
        ]);
        $item = ExpenseItem::factory()->create([
            'company_id' => $company->id,
            'expense_category_id' => $category->id,
            'expense_type_id' => $type->id,
        ]);

        $this->deleteJson("/api/v1/modules/cfo/companies/{$company->id}")->assertOk();

        $this->assertSoftDeleted('companies', ['id' => $company->id]);
        $this->assertSoftDeleted('capital_companies', ['id' => $capital->id]);
        $this->assertSoftDeleted('company_assets', ['id' => $asset->id]);
        $this->assertSoftDeleted('expense_categories', ['id' => $category->id]);
        $this->assertSoftDeleted('expense_types', ['id' => $type->id]);
        $this->assertSoftDeleted('expense_items', ['id' => $item->id]);
    });

    it('rejects duplicate active (name, series) including case/whitespace variants and allows re-create after soft-delete', function () {
        $first = $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => '  PT.   Slaras Nusa Foodlab  ',
            'series' => 1,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'PT. Slaras Nusa Foodlab');

        $firstId = $first->json('data.id');

        // Exact, case-insensitive, and whitespace-padded duplicates are rejected with 422
        $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => 'pt. slaras nusa foodlab',
            'series' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Different series with the same company name is allowed
        $series2 = $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => 'PT. Slaras Nusa Foodlab',
            'series' => 2,
        ])->assertCreated();

        // Updating series 2 back to series 1 collides and is rejected with 422
        $this->patchJson('/api/v1/modules/cfo/companies/'.$series2->json('data.id'), [
            'series' => 1,
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        // Updating self keeping same (name, series) succeeds
        $this->putJson("/api/v1/modules/cfo/companies/{$firstId}", [
            'name' => 'PT. Slaras Nusa Foodlab',
            'series' => 1,
        ])->assertOk();

        // Soft-deleting frees (name, series) for re-creation
        $this->deleteJson("/api/v1/modules/cfo/companies/{$firstId}")->assertOk();

        $recreated = $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => 'PT. Slaras Nusa Foodlab',
            'series' => 1,
        ])->assertCreated();

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });
});
