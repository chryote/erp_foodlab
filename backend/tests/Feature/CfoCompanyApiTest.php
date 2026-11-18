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

    it('creates, updates, and soft-deletes a company', function () {
        $createRes = $this->postJson('/api/v1/modules/cfo/companies', [
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('data.name', 'PT. Slaras Nusa Foodlab');

        $companyId = $createRes->json('data.id');
        $this->assertDatabaseHas('companies', [
            'id' => $companyId,
            'name' => 'PT. Slaras Nusa Foodlab',
        ]);

        $updateRes = $this->putJson("/api/v1/modules/cfo/companies/{$companyId}", [
            'name' => 'PT. Slaras Nusa Foodlab Internasional',
        ]);

        $updateRes->assertOk()
            ->assertJsonPath('data.name', 'PT. Slaras Nusa Foodlab Internasional');

        $deleteRes = $this->deleteJson("/api/v1/modules/cfo/companies/{$companyId}");
        $deleteRes->assertOk();

        $this->assertSoftDeleted('companies', ['id' => $companyId]);

        $listRes = $this->getJson('/api/v1/modules/cfo/companies');
        $listRes->assertOk()->assertJsonCount(0, 'data');
    });

    it('validates company name when creating or updating', function () {
        $this->postJson('/api/v1/modules/cfo/companies', ['name' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    });
});
