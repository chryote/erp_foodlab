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
        $otherCompany = Company::factory()->create(['name' => 'PT. Foodlab Cabang']);

        // Create via FormRequest + DB::transaction (company-agnostic)
        $createRes = $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'code' => 'TK/0',
            'name' => 'Tidak Kawin Tanpa Tanggungan',
            'description' => 'Wajib pajak tidak kawin tanpa tanggungan.',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'code',
                    'name',
                    'description',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.company_id')
            ->assertJsonMissingPath('data.company')
            ->assertJsonMissingPath('data.employees')
            ->assertJsonPath('data.code', 'TK/0')
            ->assertJsonPath('data.name', 'Tidak Kawin Tanpa Tanggungan')
            ->assertJsonPath('data.description', 'Wajib pajak tidak kawin tanpa tanggungan.');

        $tk0Id = $createRes->json('data.id');

        $k1 = TaxStatus::factory()->create([
            'code' => 'K/1',
            'name' => 'Kawin 1 Tanggungan',
            'description' => null,
        ]);

        // Available across all companies
        Employee::factory()->create([
            'company_id' => $company->id,
            'tax_status_id' => $k1->id,
            'name' => 'Dewi Lestari',
        ]);
        Employee::factory()->create([
            'company_id' => $otherCompany->id,
            'tax_status_id' => $k1->id,
            'name' => 'Andi Cabang',
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
            ->assertJsonCount(2, 'data.1.employees');

        // Show single item
        $this->getJson("/api/v1/modules/cho/tax-statuses/{$tk0Id}")
            ->assertOk()
            ->assertJsonPath('data.id', $tk0Id)
            ->assertJsonPath('data.code', 'TK/0');

        // Update (PUT) keeping same code works and forgets cache
        $this->putJson("/api/v1/modules/cho/tax-statuses/{$tk0Id}", [
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

    it('allows nullable code and description on create and update without unique collision', function () {
        // Create with only name (code & description omitted)
        $first = $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'name' => 'Tidak Kawin 0',
        ])->assertCreated()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Tidak Kawin 0')
            ->assertJsonPath('data.description', null);

        // Create second tax status with empty/whitespace code & description (both normalized to null, no unique conflict)
        $second = $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'code' => '   ',
            'name' => 'Kawin 1',
            'description' => '',
        ])->assertCreated()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Kawin 1')
            ->assertJsonPath('data.description', null);

        expect($first->json('data.id'))->not->toBe($second->json('data.id'));

        // Update to add a code & description, then clear them back to null
        $secondId = $second->json('data.id');
        $this->putJson("/api/v1/modules/cho/tax-statuses/{$secondId}", [
            'code' => 'K/1',
            'name' => 'Kawin 1',
            'description' => 'PTKP Kawin 1 Tanggungan',
        ])->assertOk()
            ->assertJsonPath('data.code', 'K/1')
            ->assertJsonPath('data.description', 'PTKP Kawin 1 Tanggungan');

        $this->putJson("/api/v1/modules/cho/tax-statuses/{$secondId}", [
            'code' => null,
            'name' => 'Kawin 1 Updated',
            'description' => null,
        ])->assertOk()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Kawin 1 Updated')
            ->assertJsonPath('data.description', null);
    });

    it('returns 422 on duplicate code, empty name, and soft-delete while referenced by active employees', function () {
        $company = Company::factory()->create();

        $existing = TaxStatus::factory()->create([
            'code' => 'K/0',
            'name' => 'Kawin Tanpa Tanggungan',
        ]);

        $other = TaxStatus::factory()->create([
            'code' => 'K/2',
            'name' => 'Kawin 2 Tanggungan',
        ]);

        // Duplicate code & empty name on store
        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'code' => 'K/0',
            'name' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'name']);

        // Duplicate code on update to another tax status's code
        $this->putJson("/api/v1/modules/cho/tax-statuses/{$other->id}", [
            'code' => 'K/0',
            'name' => 'Kawin 2 Tanggungan Updated',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        // Max length validation (code > 20, name > 100)
        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'code' => str_repeat('A', 21),
            'name' => str_repeat('B', 101),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'name']);

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

        // Code can be reused globally after soft-delete
        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'code' => $existing->code,
            'name' => 'Tax Reborn',
        ])->assertCreated();
    });

    it('rejects duplicate active tax status names (even without code, case/whitespace variants) and allows reuse after soft-delete', function () {
        $first = $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'name' => '  Tidak   Kawin / 0 Tanggungan ',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Tidak Kawin / 0 Tanggungan');

        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'name' => 'tidak kawin / 0 tanggungan',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name']);

        $this->deleteJson('/api/v1/modules/cho/tax-statuses/'.$first->json('data.id'))->assertOk();
        $this->postJson('/api/v1/modules/cho/tax-statuses', [
            'name' => 'Tidak Kawin / 0 Tanggungan',
        ])->assertCreated();
    });
});
