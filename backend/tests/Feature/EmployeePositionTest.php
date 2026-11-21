<?php

use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Modules\CHO\Services\EmployeePositionService;
use Illuminate\Support\Facades\Cache;

describe('EmployeePosition CHO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes, caching, and JsonResource structure', function () {
        $company = Company::factory()->create(['name' => 'PT. Foodlab Nusantara']);

        // Create via FormRequest + DB::transaction
        $createRes = $this->postJson('/api/v1/modules/cho/employee-positions', [
            'company_id' => $company->id,
            'code' => 'QA-LEAD',
            'name' => 'Quality Assurance Lead',
            'description' => 'Memimpin tim QA laboratorium pangan.',
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
            ->assertJsonPath('data.code', 'QA-LEAD')
            ->assertJsonPath('data.name', 'Quality Assurance Lead')
            ->assertJsonPath('data.description', 'Memimpin tim QA laboratorium pangan.');

        $qaId = $createRes->json('data.id');

        $analyst = EmployeePosition::factory()->create([
            'company_id' => $company->id,
            'code' => 'LAB-ANL',
            'name' => 'Analis Mikrobiologi',
            'description' => null,
        ]);

        $microEmployee = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_position_id' => $analyst->id,
            'name' => 'Siti Aminah',
        ]);

        // Unfiltered list uses defaultSort('name', 'id') and populates cache
        expect(Cache::has(EmployeePositionService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cho/employee-positions')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.cache_key', EmployeePositionService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $analyst->id) // Analis Mikrobiologi < Quality Assurance Lead
            ->assertJsonPath('data.1.id', $qaId);

        expect(Cache::has(EmployeePositionService::CACHE_KEY_LIST))->toBeTrue();

        // Filter search on code & name
        $this->getJson('/api/v1/modules/cho/employee-positions?filter[search]=QA-LEAD')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $qaId);

        $this->getJson('/api/v1/modules/cho/employee-positions?filter[search]=Mikrobiologi&per_page=5&page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $analyst->id)
            ->assertJsonPath('meta.total', 1);

        // Sort + include=employees
        $this->getJson('/api/v1/modules/cho/employee-positions?sort=-code&include=employees')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $qaId)
            ->assertJsonPath('data.1.id', $analyst->id)
            ->assertJsonPath('data.1.employees.0.id', $microEmployee->id)
            ->assertJsonPath('data.1.employees.0.name', 'Siti Aminah');

        // Show single item
        $this->getJson("/api/v1/modules/cho/employee-positions/{$qaId}")
            ->assertOk()
            ->assertJsonPath('data.id', $qaId)
            ->assertJsonPath('data.code', 'QA-LEAD')
            ->assertJsonPath('data.company.name', 'PT. Foodlab Nusantara');

        // Update (PUT) keeping same code works and forgets cache
        $this->putJson("/api/v1/modules/cho/employee-positions/{$qaId}", [
            'company_id' => $company->id,
            'code' => 'QA-LEAD',
            'name' => 'Head of Quality Assurance',
            'description' => 'Updated description',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Head of Quality Assurance')
            ->assertJsonPath('data.description', 'Updated description');

        expect(Cache::has(EmployeePositionService::CACHE_KEY_LIST))->toBeFalse();

        // Update (PATCH) partial payload works
        $this->patchJson("/api/v1/modules/cho/employee-positions/{$qaId}", [
            'name' => 'QA Manager',
        ])->assertOk()
            ->assertJsonPath('data.code', 'QA-LEAD')
            ->assertJsonPath('data.name', 'QA Manager');

        // Soft delete unused position
        $this->deleteJson("/api/v1/modules/cho/employee-positions/{$qaId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('employee_positions', ['id' => $qaId]);
        $this->getJson("/api/v1/modules/cho/employee-positions/{$qaId}")->assertNotFound();
    });

    it('allows nullable code and description on create and update without unique collision', function () {
        $company = Company::factory()->create();

        // Create with only company_id and name (code & description omitted)
        $first = $this->postJson('/api/v1/modules/cho/employee-positions', [
            'company_id' => $company->id,
            'name' => 'Staff A',
        ])->assertCreated()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Staff A')
            ->assertJsonPath('data.description', null);

        // Create second position with empty/whitespace code & description (both normalized to null, no unique conflict)
        $second = $this->postJson('/api/v1/modules/cho/employee-positions', [
            'company_id' => $company->id,
            'code' => '   ',
            'name' => 'Staff B',
            'description' => '',
        ])->assertCreated()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Staff B')
            ->assertJsonPath('data.description', null);

        expect($first->json('data.id'))->not->toBe($second->json('data.id'));

        // Update to add a code, then clear it back to null
        $secondId = $second->json('data.id');
        $this->putJson("/api/v1/modules/cho/employee-positions/{$secondId}", [
            'company_id' => $company->id,
            'code' => 'POS-B',
            'name' => 'Staff B',
            'description' => 'Tugas B',
        ])->assertOk()
            ->assertJsonPath('data.code', 'POS-B')
            ->assertJsonPath('data.description', 'Tugas B');

        $this->putJson("/api/v1/modules/cho/employee-positions/{$secondId}", [
            'company_id' => $company->id,
            'code' => null,
            'name' => 'Staff B Updated',
            'description' => null,
        ])->assertOk()
            ->assertJsonPath('data.code', null)
            ->assertJsonPath('data.name', 'Staff B Updated')
            ->assertJsonPath('data.description', null);
    });

    it('returns 422 on duplicate code, empty name, and soft-delete while referenced by active employees', function () {
        $company = Company::factory()->create();

        $existing = EmployeePosition::factory()->create([
            'company_id' => $company->id,
            'code' => 'QC-01',
            'name' => 'QC Inspector',
        ]);

        $other = EmployeePosition::factory()->create([
            'company_id' => $company->id,
            'code' => 'QC-02',
            'name' => 'QC Supervisor',
        ]);

        // Duplicate code & empty name on store
        $this->postJson('/api/v1/modules/cho/employee-positions', [
            'company_id' => $company->id,
            'code' => 'QC-01',
            'name' => '',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code', 'name']);

        // Duplicate code on update to another position's code
        $this->putJson("/api/v1/modules/cho/employee-positions/{$other->id}", [
            'company_id' => $company->id,
            'code' => 'QC-01',
            'name' => 'QC Supervisor Updated',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        // Soft-deleted company is rejected
        $deletedCompany = Company::factory()->create();
        $deletedCompany->delete();

        $this->postJson('/api/v1/modules/cho/employee-positions', [
            'company_id' => $deletedCompany->id,
            'code' => str_repeat('A', 51),
            'name' => str_repeat('B', 151),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id', 'code', 'name']);

        // Block soft delete (422) if referenced by active employees
        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_position_id' => $existing->id,
        ]);

        $this->deleteJson("/api/v1/modules/cho/employee-positions/{$existing->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_position']);

        $this->assertNotSoftDeleted('employee_positions', ['id' => $existing->id]);

        // Once referencing employee is soft-deleted, position can be soft-deleted
        $employee->delete();

        $this->deleteJson("/api/v1/modules/cho/employee-positions/{$existing->id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('employee_positions', ['id' => $existing->id]);
    });
});
