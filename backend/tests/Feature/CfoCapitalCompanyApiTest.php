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

    it('filters and paginates capital companies by company_id, company name, stakeholder_name, or capital', function () {
        $c1 = Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);
        $c2 = Company::factory()->create([
            'name' => 'PT. Agro Pangan Sejahtera',
        ]);

        CapitalCompany::factory()->create([
            'company_id' => $c1->id,
            'stakeholder_name' => 'Rian',
            'capital' => 150000000.5,
        ]);
        CapitalCompany::factory()->create([
            'company_id' => $c1->id,
            'stakeholder_name' => 'Siti Aminah',
            'capital' => 275000000.75,
        ]);
        CapitalCompany::factory()->create([
            'company_id' => $c2->id,
            'stakeholder_name' => 'Andi Wijaya',
            'capital' => 500000000.0,
        ]);

        $filteredByStakeholder = $this->getJson('/api/v1/modules/cfo/capital-companies?search=Siti');
        $filteredByStakeholder->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.company_id', $c1->id)
            ->assertJsonPath('data.0.stakeholder_name', 'Siti Aminah')
            ->assertJsonPath('data.0.company.name', 'PT. Slaras Nusa Foodlab');

        $filteredByCompany = $this->getJson("/api/v1/modules/cfo/capital-companies?company_id={$c1->id}");
        $filteredByCompany->assertOk()
            ->assertJsonCount(2, 'data');
        expect((float) $filteredByCompany->json('meta.total_capital'))->toBe(425000001.25);

        $paginated = $this->getJson('/api/v1/modules/cfo/capital-companies?page=1&per_page=2');
        $paginated->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.last_page', 2);
    });

    it('creates, updates, shows, and soft-deletes a capital company with stakeholder_name and float capital', function () {
        $companyA = Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);
        $companyB = Company::factory()->create([
            'name' => 'PT. Pangan Nusantara',
        ]);

        $createRes = $this->postJson('/api/v1/modules/cfo/capital-companies', [
            'company_id' => $companyA->id,
            'stakeholder_name' => 'Rian',
            'capital' => 250000000.75,
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.stakeholder_name', 'Rian')
            ->assertJsonPath('data.company.name', 'PT. Slaras Nusa Foodlab');

        expect((float) $createRes->json('data.capital'))->toBe(250000000.75);

        $capitalCompanyId = $createRes->json('data.id');
        $this->assertDatabaseHas('capital_companies', [
            'id' => $capitalCompanyId,
            'company_id' => $companyA->id,
            'stakeholder_name' => 'Rian',
        ]);

        $showRes = $this->getJson("/api/v1/modules/cfo/capital-companies/{$capitalCompanyId}");
        $showRes->assertOk()
            ->assertJsonPath('data.id', $capitalCompanyId)
            ->assertJsonPath('data.stakeholder_name', 'Rian')
            ->assertJsonPath('data.company.name', 'PT. Slaras Nusa Foodlab');

        $updateRes = $this->putJson("/api/v1/modules/cfo/capital-companies/{$capitalCompanyId}", [
            'company_id' => $companyB->id,
            'stakeholder_name' => 'Siti Aminah',
            'capital' => 425500000.25,
        ]);

        $updateRes->assertOk()
            ->assertJsonPath('data.company_id', $companyB->id)
            ->assertJsonPath('data.stakeholder_name', 'Siti Aminah')
            ->assertJsonPath('data.company.name', 'PT. Pangan Nusantara');

        expect((float) $updateRes->json('data.capital'))->toBe(425500000.25);

        $deleteRes = $this->deleteJson("/api/v1/modules/cfo/capital-companies/{$capitalCompanyId}");
        $deleteRes->assertOk();

        $this->assertSoftDeleted('capital_companies', ['id' => $capitalCompanyId]);

        $listRes = $this->getJson('/api/v1/modules/cfo/capital-companies');
        $listRes->assertOk()->assertJsonCount(0, 'data');
    });

    it('validates company_id, stakeholder_name, and float capital when creating or updating', function () {
        $this->postJson('/api/v1/modules/cfo/capital-companies', [
            'company_id' => 999999,
            'stakeholder_name' => '',
            'capital' => 'invalid-number',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id', 'stakeholder_name', 'capital']);
    });
});
