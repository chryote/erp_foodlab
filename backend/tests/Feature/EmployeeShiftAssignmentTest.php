<?php

use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeShift;
use App\Models\EmployeeShiftAssignment;
use App\Modules\HR\Services\EmployeeShiftAssignmentService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;

describe('EmployeeShiftAssignment HR module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        $employeeA1 = Employee::factory()->create(['company_id' => $companyA->id, 'name' => 'Nadia Putri']);
        $employeeA2 = Employee::factory()->create(['company_id' => $companyA->id, 'name' => 'Budi Santoso']);
        $employeeB1 = Employee::factory()->create(['company_id' => $companyB->id, 'name' => 'Citra Lestari']);

        $morningShiftA = EmployeeShift::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'SHIFT-PAGI',
            'name' => 'Shift Pagi',
        ]);
        $afternoonShiftA = EmployeeShift::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'SHIFT-SIANG',
            'name' => 'Shift Siang',
        ]);
        $shiftB = EmployeeShift::factory()->create([
            'company_id' => $companyB->id,
            'code' => 'SHIFT-BETA',
            'name' => 'Shift Beta',
        ]);

        // 1. Create closed assignment for employeeA1
        $createRes = $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA1->id,
            'employee_shift_id' => $morningShiftA->id,
            'effective_date' => '2026-11-01',
            'end_date' => '2026-11-15',
            'notes' => 'Rotasi shift pagi paruh pertama',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'employee_id',
                    'employee_shift_id',
                    'effective_date',
                    'end_date',
                    'notes',
                    'company',
                    'employee',
                    'employee_shift',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.employee_id', $employeeA1->id)
            ->assertJsonPath('data.employee_shift_id', $morningShiftA->id)
            ->assertJsonPath('data.effective_date', '2026-11-01')
            ->assertJsonPath('data.end_date', '2026-11-15')
            ->assertJsonPath('data.notes', 'Rotasi shift pagi paruh pertama');

        $assignment1Id = $createRes->json('data.id');

        // 2. Create non-overlapping ongoing assignment for employeeA1 starting next day
        $assignment2Res = $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA1->id,
            'employee_shift_id' => $afternoonShiftA->id,
            'effective_date' => '2026-11-16',
            'end_date' => null,
            'notes' => 'Pindah ke shift siang',
        ])->assertCreated()
            ->assertJsonPath('data.end_date', null);

        $assignment2Id = $assignment2Res->json('data.id');

        // 3. Create ongoing assignment for employeeA2 and closed assignment for employeeB1
        $assignment3 = EmployeeShiftAssignment::factory()->create([
            'company_id' => $companyA->id,
            'employee_id' => $employeeA2->id,
            'employee_shift_id' => $morningShiftA->id,
            'effective_date' => '2026-11-10',
            'end_date' => '2026-11-25',
            'notes' => 'Shift sementara',
        ]);

        $assignment4 = EmployeeShiftAssignment::factory()->create([
            'company_id' => $companyB->id,
            'employee_id' => $employeeB1->id,
            'employee_shift_id' => $shiftB->id,
            'effective_date' => '2026-11-05',
            'end_date' => '2026-11-30',
        ]);

        // Unfiltered list populates cache and defaults sort by -effective_date, -id
        expect(Cache::has(EmployeeShiftAssignmentService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/hr/employee-shift-assignments')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('meta.cache_key', EmployeeShiftAssignmentService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $assignment2Id)
            ->assertJsonPath('data.1.id', $assignment3->id)
            ->assertJsonPath('data.2.id', $assignment4->id)
            ->assertJsonPath('data.3.id', $assignment1Id);

        expect(Cache::has(EmployeeShiftAssignmentService::CACHE_KEY_LIST))->toBeTrue();

        // Filters: company_id, employee_id, employee_shift_id, effective_date, end_date + sorts + includes
        $this->getJson("/api/v1/modules/hr/employee-shift-assignments?filter[company_id]={$companyA->id}&sort=effective_date&include=company,employee,employeeShift")
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.id', $assignment1Id)
            ->assertJsonPath('data.1.id', $assignment3->id)
            ->assertJsonPath('data.2.id', $assignment2Id)
            ->assertJsonPath('data.0.company.name', 'PT. Foodlab Alpha')
            ->assertJsonPath('data.0.employee.name', 'Nadia Putri')
            ->assertJsonPath('data.0.employee_shift.code', 'SHIFT-PAGI');

        $this->getJson("/api/v1/modules/hr/employee-shift-assignments?filter[employee_id]={$employeeA1->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/modules/hr/employee-shift-assignments?filter[employee_shift_id]={$afternoonShiftA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $assignment2Id);

        $this->getJson('/api/v1/modules/hr/employee-shift-assignments?filter[effective_date]=2026-11-10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $assignment3->id);

        $this->getJson('/api/v1/modules/hr/employee-shift-assignments?filter[end_date]=2026-11-30')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $assignment4->id);

        $this->getJson('/api/v1/modules/hr/employee-shift-assignments?sort=-end_date&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 4);

        $this->getJson('/api/v1/modules/hr/employee-shift-assignments?sort=created_at')
            ->assertOk()
            ->assertJsonCount(4, 'data');

        // Show single assignment
        $this->getJson("/api/v1/modules/hr/employee-shift-assignments/{$assignment1Id}")
            ->assertOk()
            ->assertJsonPath('data.id', $assignment1Id)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha')
            ->assertJsonPath('data.employee.name', 'Nadia Putri')
            ->assertJsonPath('data.employee_shift.code', 'SHIFT-PAGI');

        // PUT update (shorten end_date without overlapping assignment2) clears cache
        $this->putJson("/api/v1/modules/hr/employee-shift-assignments/{$assignment1Id}", [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA1->id,
            'employee_shift_id' => $morningShiftA->id,
            'effective_date' => '2026-11-01',
            'end_date' => '2026-11-14',
            'notes' => 'Diakhiri lebih awal',
        ])->assertOk()
            ->assertJsonPath('data.end_date', '2026-11-14')
            ->assertJsonPath('data.notes', 'Diakhiri lebih awal');

        expect(Cache::has(EmployeeShiftAssignmentService::CACHE_KEY_LIST))->toBeFalse();

        // PATCH partial update (close ongoing assignment2 by setting end_date)
        $this->patchJson("/api/v1/modules/hr/employee-shift-assignments/{$assignment2Id}", [
            'end_date' => '2026-12-31',
        ])->assertOk()
            ->assertJsonPath('data.end_date', '2026-12-31')
            ->assertJsonPath('data.effective_date', '2026-11-16');

        // Soft delete
        $this->deleteJson("/api/v1/modules/hr/employee-shift-assignments/{$assignment1Id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('employee_shift_assignments', ['id' => $assignment1Id]);
        $this->getJson("/api/v1/modules/hr/employee-shift-assignments/{$assignment1Id}")->assertNotFound();
    });

    it('rejects cross-company mismatch, end_date < effective_date, overlapping date ranges, and active duplicates with 422, and allows re-create after soft delete', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $employeeA = Employee::factory()->create(['company_id' => $companyA->id]);
        $employeeB = Employee::factory()->create(['company_id' => $companyB->id]);

        $shiftA = EmployeeShift::factory()->create(['company_id' => $companyA->id]);
        $shiftB = EmployeeShift::factory()->create(['company_id' => $companyB->id]);

        // 1. Cross-company employee_id and employee_shift_id fail validation with 422
        $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeB->id,
            'employee_shift_id' => $shiftB->id,
            'effective_date' => '2026-11-01',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_id', 'employee_shift_id']);

        // 2. end_date < effective_date fails validation with 422
        $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-15',
            'end_date' => '2026-11-10',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['end_date']);

        // Equal effective_date and end_date (single-day assignment) is valid
        $first = $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-10',
            'end_date' => '2026-11-20',
        ])->assertCreated();

        $firstId = $first->json('data.id');

        // PATCH changing end_date before existing effective_date fails with 422
        $this->patchJson("/api/v1/modules/hr/employee-shift-assignments/{$firstId}", [
            'end_date' => '2026-11-05',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['end_date']);

        // PATCH changing company_id without updating employee_id/shift_id fails with 422
        $this->patchJson("/api/v1/modules/hr/employee-shift-assignments/{$firstId}", [
            'company_id' => $companyB->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_id', 'employee_shift_id']);

        // 3. Active duplicate (company_id, employee_id, effective_date) rejected with 422
        $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-10',
            'end_date' => '2026-11-12',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['effective_date']);

        // DB-level unique constraint also rejects active duplicates directly
        expect(fn () => EmployeeShiftAssignment::factory()->create([
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-10',
        ]))->toThrow(QueryException::class);

        // 4. Overlapping date ranges rejected with 422 (boundary, partial, containment, and ongoing NULL end_date)
        $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-20', // overlaps boundary 2026-11-20
            'end_date' => null,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['effective_date']);

        $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-01',
            'end_date' => '2026-11-15', // overlaps 2026-11-10..2026-11-15
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['effective_date']);

        $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-01',
            'end_date' => null, // ongoing overlaps 2026-11-10..2026-11-20
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['effective_date']);

        // Create a non-overlapping later ongoing assignment (2026-11-21..NULL)
        $second = $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-21',
            'end_date' => null,
        ])->assertCreated();

        $secondId = $second->json('data.id');

        // Updating first assignment to become ongoing (end_date = null) overlaps second assignment -> 422
        $this->patchJson("/api/v1/modules/hr/employee-shift-assignments/{$firstId}", [
            'end_date' => null,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['effective_date']);

        // Updating second assignment to start earlier (2026-11-19) overlaps first assignment -> 422
        $this->patchJson("/api/v1/modules/hr/employee-shift-assignments/{$secondId}", [
            'effective_date' => '2026-11-19',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['effective_date']);

        // 5. Soft delete first assignment, then re-create on the exact same effective_date
        $this->deleteJson("/api/v1/modules/hr/employee-shift-assignments/{$firstId}")
            ->assertOk();

        $this->assertSoftDeleted('employee_shift_assignments', ['id' => $firstId]);

        $recreated = $this->postJson('/api/v1/modules/hr/employee-shift-assignments', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'effective_date' => '2026-11-10',
            'end_date' => '2026-11-20',
            'notes' => 'Re-assigned after soft delete',
        ])->assertCreated()
            ->assertJsonPath('data.effective_date', '2026-11-10')
            ->assertJsonPath('data.end_date', '2026-11-20');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });
});
