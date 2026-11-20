<?php

use App\Models\Company;
use App\Models\CompanyAsset;
use Illuminate\Support\Facades\Cache;

describe('CompanyAsset CFO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes, validation, and soft-deletes', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        // Create via FormRequest; total_price must be derived, not trusted.
        $createRes = $this->postJson('/api/v1/modules/cfo/company-assets', [
            'company_id' => $companyA->id,
            'asset_date' => '2026-11-20',
            'name' => 'Freezer Laboratorium -80C',
            'amount' => 2,
            'price_per_unit' => 75000000,
            'total_price' => 1,
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'asset_date',
                    'name',
                    'amount',
                    'price_per_unit',
                    'total_price',
                    'company',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonPath('data.name', 'Freezer Laboratorium -80C')
            ->assertJsonPath('data.amount', 2);

        expect((float) $createRes->json('data.total_price'))->toBe(150000000.0);

        $firstId = $createRes->json('data.id');

        $second = CompanyAsset::factory()->create([
            'company_id' => $companyA->id,
            'asset_date' => '2026-11-18',
            'name' => 'Sentrifus Laboratorium',
            'amount' => 1,
            'price_per_unit' => 5000000,
            'total_price' => 5000000,
        ]);

        CompanyAsset::factory()->create([
            'company_id' => $companyB->id,
            'asset_date' => '2026-11-19',
            'name' => 'Inkubator BOD',
        ]);

        // Filter + sort + include
        $this->getJson("/api/v1/modules/cfo/company-assets?filter[company_id]={$companyA->id}&sort=asset_date&include=company")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $second->id)
            ->assertJsonPath('data.1.id', $firstId)
            ->assertJsonPath('data.0.company.id', $companyA->id);

        // Search + pagination
        $this->getJson('/api/v1/modules/cfo/company-assets?filter[search]=Freezer&per_page=5&page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $firstId)
            ->assertJsonPath('meta.total', 1);

        // Show
        $this->getJson("/api/v1/modules/cfo/company-assets/{$firstId}")
            ->assertOk()
            ->assertJsonPath('data.id', $firstId)
            ->assertJsonPath('data.asset_date', '2026-11-20')
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha');

        // Update (PUT) recomputes total_price
        $this->putJson("/api/v1/modules/cfo/company-assets/{$firstId}", [
            'company_id' => $companyA->id,
            'asset_date' => '2026-11-20',
            'name' => 'Freezer Laboratorium -86C',
            'amount' => 3,
            'price_per_unit' => 76000000,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Freezer Laboratorium -86C');

        expect((float) $this->getJson("/api/v1/modules/cfo/company-assets/{$firstId}")->json('data.total_price'))
            ->toBe(228000000.0);

        // PATCH parity with PUT
        $this->patchJson("/api/v1/modules/cfo/company-assets/{$firstId}", [
            'company_id' => $companyA->id,
            'asset_date' => '2026-11-20',
            'name' => 'Freezer Laboratorium -86C (kalibrasi)',
            'amount' => 3,
            'price_per_unit' => 76000000,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Freezer Laboratorium -86C (kalibrasi)');

        // Validation: soft-deleted company, bad date, empty name, zero amount, negative price
        $deletedCompany = Company::factory()->create();
        $deletedCompany->delete();

        $this->postJson('/api/v1/modules/cfo/company-assets', [
            'company_id' => $deletedCompany->id,
            'asset_date' => '20/11/2026',
            'name' => '',
            'amount' => 0,
            'price_per_unit' => -100,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id', 'asset_date', 'name', 'amount', 'price_per_unit']);

        // Soft delete (never hard-delete ERP records)
        $this->deleteJson("/api/v1/modules/cfo/company-assets/{$firstId}")
            ->assertOk();

        $this->assertSoftDeleted('company_assets', ['id' => $firstId]);

        $this->getJson("/api/v1/modules/cfo/company-assets/{$firstId}")->assertNotFound();

        $this->getJson("/api/v1/modules/cfo/company-assets?filter[company_id]={$companyA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $second->id);
    });
});
