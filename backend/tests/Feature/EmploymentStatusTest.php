<?php

use App\Models\Company;
use App\Models\Employee;
use App\Models\EmploymentStatus;
use App\Modules\CHO\Services\EmploymentStatusService;
use Illuminate\Support\Facades\Cache;

describe('EmploymentStatus CHO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes, caching, and JsonResource structure', function () {
        $company = Company::factory()->create(['name' => 'PT. Foodlab Nusantara']);

        // Create via FormRequest + DB::transaction
        $createRes = $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'company_id' => $company->id,
            'code' => 'PKWTT',
            'name' => 'Perjanjian Kerja Waktu Tidak Tertentu',
            'description' => 'Karyawan tetap laboratorium dan operasional.',
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
            ->assertJsonPath('data.code', 'PKWTT')
            ->assertJsonPath('data.name', 'Perjanjian Kerja Waktu Tidak Tertentu')
            ->assertJsonPath('data.description', 'Karyawan tetap laboratorium dan operasional.');

        $pkwttId = $createRes->json('data.id');

        $intern = EmploymentStatus::factory()->create([
            'company_id' => $company->id,
            'code' => 'INTERN',
            'name' => 'Magang Riset',
            'description' => null,
        ]);

        $internEmployee = Employee::factory()->create([
            'company_id' => $company->id,
            'employment_status_id' => $intern->id,
            'name' => 'Budi Santoso',
        ]);

        // Unfiltered list uses defaultSort('name', 'id') and populates cache
        expect(Cache::has(EmploymentStatusService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cho/employment-statuses')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.cache_key', EmploymentStatusService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $intern->id) // Magang Riset < Perjanjian Kerja Waktu Tidak Tertentu
            ->assertJsonPath('data.1.id', $pkwttId);

        expect(Cache::has(EmploymentStatusService::CACHE_KEY_LIST))->toBeTrue();

        // Filter search on code & name
        $this->getJson('/api/v1/modules/cho/employment-statuses?filter[search]=PKWTT')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pkwttId);

        $this->getJson('/api/v1/modules/cho/employment-statuses?filter[search]=Magang&per_page=5&page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $intern->id)
            ->assertJsonPath('meta.total', 1);

        // Sort + include=employees
        $this->getJson('/api/v1/modules/cho/employment-statuses?sort=-code&include=employees')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $pkwttId)
            ->assertJsonPath('data.1.id', $intern->id)
            ->assertJsonPath('data.1.employees.0.id', $internEmployee->id)
            ->assertJsonPath('data.1.employees.0.employment_status_id', $intern->id)
            ->assertJsonPath('data.1.employees.0.name', 'Budi Santoso');

        // Show single item
        $this->getJson("/api/v1/modules/cho/employment-statuses/{$pkwttId}")
            ->assertOk()
            ->assertJsonPath('data.id', $pkwttId)
            ->assertJsonPath('data.code', 'PKWTT')
            ->assertJsonPath('data.company.name', 'PT. Foodlab Nusantara');

        // Update (PUT) keeping same code works and forgets cache
        $this->putJson("/api/v1/modules/cho/employment-statuses/{$pkwttId}", [
            'company_id' => $company->id,
            'code' => 'PKWTT',
            'name' => 'Karyawan Tetap',
            'description' => 'Updated description',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Karyawan Tetap')
            ->assertJsonPath('data.description', 'Updated description');

        expect(Cache::has(EmploymentStatusService::CACHE_KEY_LIST))->toBeFalse();

        // Update (PATCH) partial payload works
        $this->patchJson("/api/v1/modules/cho/employment-statuses/{$pkwttId}", [
            'name' => 'Pegawai Tetap',
        ])->assertOk()
            ->assertJsonPath('data.code', 'PKWTT')
            ->assertJsonPath('data.name', 'Pegawai Tetap');

        // Soft delete unused status
        $this->deleteJson("/api/v1/modules/cho/employment-statuses/{$pkwttId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('employment_statuses', ['id' => $pkwttId]);
        $this->getJson("/api/v1/modules/cho/employment-statuses/{$pkwttId}")->assertNotFound();
    });

    it('allows nullable code and description on create and update without unique collision', function () {
        $company = Company::factory()->create();

        // Create with only company_id and name (code & description omitted)
        $first = $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'company_id' => $company->id,
            'name' => 'Karyawan Tetap',
        ])->assertCreated()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Karyawan Tetap')
            ->assertJsonPath('data.description', null);

        // Create second status with empty/whitespace code & description (both normalized to null, no unique conflict)
        $second = $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'company_id' => $company->id,
            'code' => '   ',
            'name' => 'Karyawan Kontrak',
            'description' => '',
        ])->assertCreated()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Karyawan Kontrak')
            ->assertJsonPath('data.description', null);

        expect($first->json('data.id'))->not->toBe($second->json('data.id'));

        // Update to add a code & description, then clear them back to null
        $secondId = $second->json('data.id');
        $this->putJson("/api/v1/modules/cho/employment-statuses/{$secondId}", [
            'company_id' => $company->id,
            'code' => 'PKWT',
            'name' => 'Karyawan Kontrak',
            'description' => 'Perjanjian Kerja Waktu Tertentu',
        ])->assertOk()
            ->assertJsonPath('data.code', 'PKWT')
            ->assertJsonPath('data.description', 'Perjanjian Kerja Waktu Tertentu');

        $this->putJson("/api/v1/modules/cho/employment-statuses/{$secondId}", [
            'company_id' => $company->id,
            'code' => null,
            'name' => 'Karyawan Kontrak Updated',
            'description' => null,
        ])->assertOk()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Karyawan Kontrak Updated')
            ->assertJsonPath('data.description', null);
    });

    it('returns 422 on duplicate code, empty name, and soft-delete while referenced by active employees', function () {
        $company = Company::factory()->create();

        $existing = EmploymentStatus::factory()->create([
            'company_id' => $company->id,
            'code' => 'PKWT',
            'name' => 'Kontrak',
        ]);

        $other = EmploymentStatus::factory()->create([
            'company_id' => $company->id,
            'code' => 'PROBATION',
            'name' => 'Masa Percobaan',
        ]);

        // Duplicate code & empty name on store
        $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'company_id' => $company->id,
            'code' => 'PKWT',
            'name' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'name']);

        // Duplicate code on update to another status's code
        $this->putJson("/api/v1/modules/cho/employment-statuses/{$other->id}", [
            'company_id' => $company->id,
            'code' => 'PKWT',
            'name' => 'Masa Percobaan Updated',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        // Soft-deleted company & max length validation (code > 50, name > 100)
        $deletedCompany = Company::factory()->create();
        $deletedCompany->delete();

        $this->postJson('/api/v1/modules/cho/employment-statuses', [
            'company_id' => $deletedCompany->id,
            'code' => str_repeat('A', 51),
            'name' => str_repeat('B', 101),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id', 'code', 'name']);

        // Block soft delete (422) if referenced by active employees
        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'employment_status_id' => $existing->id,
        ]);

        $this->deleteJson("/api/v1/modules/cho/employment-statuses/{$existing->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['employment_status']);

        $this->assertNotSoftDeleted('employment_statuses', ['id' => $existing->id]);

        // Once referencing employee is soft-deleted, status can be soft-deleted
        $employee->delete();

        $this->deleteJson("/api/v1/modules/cho/employment-statuses/{$existing->id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('employment_statuses', ['id' => $existing->id]);
    });
});
