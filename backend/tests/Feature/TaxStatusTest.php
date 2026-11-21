<?php

use App\Models\Company;
use App\Models\Employee;
use App\Models\TaxStatus;
use App\Modules\CHO\Services\TaxStatusService;
use Illuminate\Support\Facades\Cache;

describe('TaxStatus CHO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes, caching, and JsonResource structure', function () {
        $company = Company::factory()->create(['name' => 'PT. Foodlab Nusantara']);

        // Create via FormRequest + DB::transaction
        $createRes = $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'company_id' => $company->id,
            'code' => 'TK/0',
            'name' => 'Tidak Kawin Tanpa Tanggungan',
            'description' => 'Wajib pajak tidak kawin tanpa tanggungan.',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'code',
                    'name',
                    'description',
                    'company',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.employees')
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.code', 'TK/0')
            ->assertJsonPath('data.name', 'Tidak Kawin Tanpa Tanggungan')
            ->assertJsonPath('data.description', 'Wajib pajak tidak kawin tanpa tanggungan.');

        $tk0Id = $createRes->json('data.id');

        $k1 = TaxStatus::factory()->create([
            'company_id' => $company->id,
            'code' => 'K/1',
            'name' => 'Kawin 1 Tanggungan',
            'description' => null,
        ]);

        $k1Employee = Employee::factory()->create([
            'company_id' => $company->id,
            'tax_status_id' => $k1->id,
            'name' => 'Dewi Lestari',
        ]);

        // Unfiltered list uses defaultSort('code', 'id') and populates cache
        expect(Cache::has(TaxStatusService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cho/tax-statuses')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.cache_key', TaxStatusService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $k1->id) // K/1 < TK/0
            ->assertJsonPath('data.1.id', $tk0Id);

        expect(Cache::has(TaxStatusService::CACHE_KEY_LIST))->toBeTrue();

        // Filter search on code & name
        $this->getJson('/api/v1/modules/cho/tax-statuses?filter[search]=TK/0')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $tk0Id);

        $this->getJson('/api/v1/modules/cho/tax-statuses?filter[search]=Tanggungan&per_page=1&page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 2);

        // Sort + include=employees
        $this->getJson('/api/v1/modules/cho/tax-statuses?sort=-code&include=employees')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $tk0Id)
            ->assertJsonPath('data.1.id', $k1->id)
            ->assertJsonPath('data.1.employees.0.id', $k1Employee->id)
            ->assertJsonPath('data.1.employees.0.tax_status_id', $k1->id)
            ->assertJsonPath('data.1.employees.0.name', 'Dewi Lestari');

        // Show single item
        $this->getJson("/api/v1/modules/cho/tax-statuses/{$tk0Id}")
            ->assertOk()
            ->assertJsonPath('data.id', $tk0Id)
            ->assertJsonPath('data.code', 'TK/0')
            ->assertJsonPath('data.company.name', 'PT. Foodlab Nusantara');

        // Update (PUT) keeping same code works and forgets cache
        $this->putJson("/api/v1/modules/cho/tax-statuses/{$tk0Id}", [
            'company_id' => $company->id,
            'code' => 'TK/0',
            'name' => 'TK/0 Standar',
            'description' => 'Updated description',
        ])->assertOk()
            ->assertJsonPath('data.name', 'TK/0 Standar')
            ->assertJsonPath('data.description', 'Updated description');

        expect(Cache::has(TaxStatusService::CACHE_KEY_LIST))->toBeFalse();

        // Update (PATCH) partial payload works
        $this->patchJson("/api/v1/modules/cho/tax-statuses/{$tk0Id}", [
            'name' => 'TK/0 PTKP Dasar',
        ])->assertOk()
            ->assertJsonPath('data.code', 'TK/0')
            ->assertJsonPath('data.name', 'TK/0 PTKP Dasar');

        // Soft delete unused tax status
        $this->deleteJson("/api/v1/modules/cho/tax-statuses/{$tk0Id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('tax_statuses', ['id' => $tk0Id]);
        $this->getJson("/api/v1/modules/cho/tax-statuses/{$tk0Id}")->assertNotFound();
    });

    it('returns 422 on duplicate code, empty name, and soft-delete while referenced by active employees', function () {
        $company = Company::factory()->create();

        $existing = TaxStatus::factory()->create([
            'company_id' => $company->id,
            'code' => 'K/0',
            'name' => 'Kawin Tanpa Tanggungan',
        ]);

        $other = TaxStatus::factory()->create([
            'company_id' => $company->id,
            'code' => 'K/2',
            'name' => 'Kawin 2 Tanggungan',
        ]);

        // Duplicate code & empty name on store
        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'company_id' => $company->id,
            'code' => 'K/0',
            'name' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'name']);

        // Duplicate code on update to another tax status's code
        $this->putJson("/api/v1/modules/cho/tax-statuses/{$other->id}", [
            'company_id' => $company->id,
            'code' => 'K/0',
            'name' => 'Kawin 2 Tanggungan Updated',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        // Soft-deleted company & max length validation (code > 20, name > 100)
        $deletedCompany = Company::factory()->create();
        $deletedCompany->delete();

        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'company_id' => $deletedCompany->id,
            'code' => str_repeat('A', 21),
            'name' => str_repeat('B', 101),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id', 'code', 'name']);

        // Block soft delete (422) if referenced by active employees
        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'tax_status_id' => $existing->id,
        ]);

        $this->deleteJson("/api/v1/modules/cho/tax-statuses/{$existing->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tax_status']);

        $this->assertNotSoftDeleted('tax_statuses', ['id' => $existing->id]);

        // Once referencing employee is soft-deleted, tax status can be soft-deleted
        $employee->delete();

        $this->deleteJson("/api/v1/modules/cho/tax-statuses/{$existing->id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('tax_statuses', ['id' => $existing->id]);
    });
});
