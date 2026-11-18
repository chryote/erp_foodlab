<?php

use App\Models\CapitalCompany;
use App\Models\Company;
use App\Modules\CFO\Services\CapitalCompanyService;
use Illuminate\Support\Facades\Cache;

describe('CFO CapitalCompany CRUD API (/api/v1/modules/cfo/capital-companies)', function () {
    beforeEach(function () {
        Cache::flush();
    });

    it('lists capital companies with company relation and caches results', function () {
        $company = Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
            'stakeholder_name' => 'Rian',
        ]);
        CapitalCompany::factory()->count(2)->create([
            'company_id' => $company->id,
        ]);

        expect(Cache::has(CapitalCompanyService::CACHE_KEY_LIST))->toBeFalse();

        $response = $this->getJson('/api/v1/modules/cfo/capital-companies');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.company.name', 'PT. Slaras Nusa Foodlab')
            ->assertJsonPath('meta.cache_key', CapitalCompanyService::CACHE_KEY_LIST);

        expect((float) $response->json('meta.total_capital'))->toBeGreaterThan(0.0);
        expect(Cache::has(CapitalCompanyService::CACHE_KEY_LIST))->toBeTrue();
    });

    it('filters and paginates capital companies by company name, stakeholder, or capital', function () {
        $c1 = Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
            'stakeholder_name' => 'Rian',
        ]);
        $c2 = Company::factory()->create([
            'name' => 'PT. Agro Pangan Sejahtera',
            'stakeholder_name' => 'Siti Aminah',
        ]);
        $c3 = Company::factory()->create([
            'name' => 'PT. Dairy Nusantara',
            'stakeholder_name' => 'Andi Wijaya',
        ]);

        CapitalCompany::factory()->create([
            'company_id' => $c1->id,
            'capital' => 150000000.5,
        ]);
        CapitalCompany::factory()->create([
            'company_id' => $c2->id,
            'capital' => 275000000.75,
        ]);
        CapitalCompany::factory()->create([
            'company_id' => $c3->id,
            'capital' => 500000000.0,
        ]);

        $filtered = $this->getJson('/api/v1/modules/cfo/capital-companies?search=Siti');
        $filtered->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.company_id', $c2->id)
            ->assertJsonPath('data.0.company.name', 'PT. Agro Pangan Sejahtera');

        $paginated = $this->getJson('/api/v1/modules/cfo/capital-companies?page=1&per_page=2');
        $paginated->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.last_page', 2);
    });

    it('creates, updates, shows, and soft-deletes a capital company with float capital', function () {
        $companyA = Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
            'stakeholder_name' => 'Rian',
        ]);
        $companyB = Company::factory()->create([
            'name' => 'PT. Pangan Nusantara',
            'stakeholder_name' => 'Siti Aminah',
        ]);

        $createRes = $this->postJson('/api/v1/modules/cfo/capital-companies', [
            'company_id' => $companyA->id,
            'capital' => 250000000.75,
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.company.name', 'PT. Slaras Nusa Foodlab');

        expect((float) $createRes->json('data.capital'))->toBe(250000000.75);

        $capitalCompanyId = $createRes->json('data.id');
        $this->assertDatabaseHas('capital_companies', [
            'id' => $capitalCompanyId,
            'company_id' => $companyA->id,
        ]);

        $showRes = $this->getJson("/api/v1/modules/cfo/capital-companies/{$capitalCompanyId}");
        $showRes->assertOk()
            ->assertJsonPath('data.id', $capitalCompanyId)
            ->assertJsonPath('data.company.name', 'PT. Slaras Nusa Foodlab');

        $updateRes = $this->putJson("/api/v1/modules/cfo/capital-companies/{$capitalCompanyId}", [
            'company_id' => $companyB->id,
            'capital' => 425500000.25,
        ]);

        $updateRes->assertOk()
            ->assertJsonPath('data.company_id', $companyB->id)
            ->assertJsonPath('data.company.name', 'PT. Pangan Nusantara');

        expect((float) $updateRes->json('data.capital'))->toBe(425500000.25);

        $deleteRes = $this->deleteJson("/api/v1/modules/cfo/capital-companies/{$capitalCompanyId}");
        $deleteRes->assertOk();

        $this->assertSoftDeleted('capital_companies', ['id' => $capitalCompanyId]);

        $listRes = $this->getJson('/api/v1/modules/cfo/capital-companies');
        $listRes->assertOk()->assertJsonCount(0, 'data');
    });

    it('validates company_id and float capital when creating or updating', function () {
        $this->postJson('/api/v1/modules/cfo/capital-companies', [
            'company_id' => 999999,
            'capital' => 'invalid-number',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id', 'capital']);
    });
});
