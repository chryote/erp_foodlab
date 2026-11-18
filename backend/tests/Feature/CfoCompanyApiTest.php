<?php

use App\Models\Company;
use App\Modules\CFO\Services\CompanyService;
use Illuminate\Support\Facades\Cache;

describe('CFO Company CRUD API (/api/v1/modules/cfo/companies)', function () {
    beforeEach(function () {
        Cache::flush();
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

    it('filters and paginates companies by name or stakeholder_name', function () {
        Company::factory()->create([
            'name' => 'PT. Slaras Nusa Foodlab',
            'stakeholder_name' => 'Rian',
        ]);
        Company::factory()->create([
            'name' => 'PT. Agro Pangan Sejahtera',
            'stakeholder_name' => 'Siti Aminah',
        ]);
        Company::factory()->create([
            'name' => 'PT. Dairy Nusantara',
            'stakeholder_name' => 'Andi Wijaya',
        ]);

        $filtered = $this->getJson('/api/v1/modules/cfo/companies?search=Siti');
        $filtered->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'PT. Agro Pangan Sejahtera')
            ->assertJsonPath('data.0.stakeholder_name', 'Siti Aminah');

        $paginated = $this->getJson('/api/v1/modules/cfo/companies?page=1&per_page=2');
        $paginated->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.last_page', 2);
    });

    it('creates, updates, and soft-deletes a company with stakeholder_name', function () {
        $createRes = $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => 'PT. Slaras Nusa Foodlab',
            'stakeholder_name' => 'Rian',
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.name', 'PT. Slaras Nusa Foodlab')
            ->assertJsonPath('data.stakeholder_name', 'Rian');

        $companyId = $createRes->json('data.id');
        $this->assertDatabaseHas('companies', [
            'id' => $companyId,
            'name' => 'PT. Slaras Nusa Foodlab',
            'stakeholder_name' => 'Rian',
        ]);

        $updateRes = $this->putJson("/api/v1/modules/cfo/companies/{$companyId}", [
            'name' => 'PT. Slaras Nusa Foodlab Internasional',
            'stakeholder_name' => 'Rina Kartika',
        ]);

        $updateRes->assertOk()
            ->assertJsonPath('data.name', 'PT. Slaras Nusa Foodlab Internasional')
            ->assertJsonPath('data.stakeholder_name', 'Rina Kartika');

        $deleteRes = $this->deleteJson("/api/v1/modules/cfo/companies/{$companyId}");
        $deleteRes->assertOk();

        $this->assertSoftDeleted('companies', ['id' => $companyId]);

        $listRes = $this->getJson('/api/v1/modules/cfo/companies');
        $listRes->assertOk()->assertJsonCount(0, 'data');
    });

    it('validates company name and stakeholder_name when creating or updating', function () {
        $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => '',
            'stakeholder_name' => '',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'stakeholder_name']);
    });
});
