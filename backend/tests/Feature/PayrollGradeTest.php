<?php

use App\Models\Company;
use App\Models\Employee;
use App\Models\PayrollGrade;
use App\Modules\CHO\Services\PayrollGradeService;
use Illuminate\Support\Facades\Cache;

describe('PayrollGrade CHO module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, exact derived payroll calculations, QueryBuilder filtering/sorting/includes, caching, and JsonResource structure', function () {
        $company = Company::factory()->create(['name' => 'PT. Foodlab Nusantara']);

        // Store with forged derived fields & omitted position_allowance (defaults to 0)
        $createNoAllowanceRes = $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $company->id,
            'grade' => 1,
            'sub_grade' => 'B',
            'level_label' => 'staff, spv',
            'base_salary' => 3555555,
            'total_gross' => 999999999,
            'net_employee_received' => 1,
            'total_company_cost' => 1,
        ]);

        $createNoAllowanceRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'grade',
                    'sub_grade',
                    'level_label',
                    'base_salary',
                    'position_allowance',
                    'total_gross',
                    'bpjs_kesehatan_company',
                    'bpjs_kesehatan_employee',
                    'bpjs_ketenagakerjaan_company',
                    'bpjs_ketenagakerjaan_employee',
                    'net_employee_received',
                    'total_company_cost',
                    'company',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.employees')
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.grade', 1)
            ->assertJsonPath('data.sub_grade', 'B')
            ->assertJsonPath('data.level_label', 'staff, spv');

        expect((float) $createNoAllowanceRes->json('data.base_salary'))->toBe(3555555.0);
        expect((float) $createNoAllowanceRes->json('data.position_allowance'))->toBe(0.0);
        expect((float) $createNoAllowanceRes->json('data.total_gross'))->toBe(3555555.0);
        // 3555555 * 0.04 = 142222.2 -> 142222
        expect((float) $createNoAllowanceRes->json('data.bpjs_kesehatan_company'))->toBe(142222.0);
        // 3555555 * 0.01 = 35555.55 -> 35556
        expect((float) $createNoAllowanceRes->json('data.bpjs_kesehatan_employee'))->toBe(35556.0);
        // 3555555 * 0.0394 = 140088.867 -> 140089
        expect((float) $createNoAllowanceRes->json('data.bpjs_ketenagakerjaan_company'))->toBe(140089.0);
        // 3555555 * 0.02 = 71111.1 -> 71111
        expect((float) $createNoAllowanceRes->json('data.bpjs_ketenagakerjaan_employee'))->toBe(71111.0);
        // 3555555 - 35556 - 71111 = 3448888
        expect((float) $createNoAllowanceRes->json('data.net_employee_received'))->toBe(3448888.0);
        // 3555555 + 142222 + 140089 = 3837866
        expect((float) $createNoAllowanceRes->json('data.total_company_cost'))->toBe(3837866.0);

        $grade1BId = $createNoAllowanceRes->json('data.id');

        // Store with base_salary + position_allowance
        $createWithAllowanceRes = $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $company->id,
            'grade' => 1,
            'sub_grade' => 'A',
            'level_label' => 'staff khusus, spv khusus',
            'base_salary' => 5000000,
            'position_allowance' => 1000000,
        ]);

        $createWithAllowanceRes->assertCreated();
        expect((float) $createWithAllowanceRes->json('data.total_gross'))->toBe(6000000.0);
        expect((float) $createWithAllowanceRes->json('data.bpjs_kesehatan_company'))->toBe(240000.0);
        expect((float) $createWithAllowanceRes->json('data.bpjs_kesehatan_employee'))->toBe(60000.0);
        expect((float) $createWithAllowanceRes->json('data.bpjs_ketenagakerjaan_company'))->toBe(236400.0);
        expect((float) $createWithAllowanceRes->json('data.bpjs_ketenagakerjaan_employee'))->toBe(120000.0);
        expect((float) $createWithAllowanceRes->json('data.net_employee_received'))->toBe(5820000.0);
        expect((float) $createWithAllowanceRes->json('data.total_company_cost'))->toBe(6476400.0);

        $grade1AId = $createWithAllowanceRes->json('data.id');

        // Create grade 2 A with factory & attach employee
        $grade2A = PayrollGrade::factory()->create([
            'company_id' => $company->id,
            'grade' => 2,
            'sub_grade' => 'A',
            'level_label' => 'manager',
            'base_salary' => 10000000,
            'position_allowance' => 2000000,
        ]);

        $managerEmployee = Employee::factory()->create([
            'company_id' => $company->id,
            'payroll_grade_id' => $grade2A->id,
            'name' => 'Andi Wijaya',
        ]);

        // Unfiltered list uses defaultSort('grade', 'sub_grade') and populates cache
        expect(Cache::has(PayrollGradeService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cho/payroll-grades')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', PayrollGradeService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $grade1AId) // (1, A)
            ->assertJsonPath('data.1.id', $grade1BId) // (1, B)
            ->assertJsonPath('data.2.id', $grade2A->id); // (2, A)

        expect(Cache::has(PayrollGradeService::CACHE_KEY_LIST))->toBeTrue();

        // Exact filters: grade & sub_grade
        $this->getJson('/api/v1/modules/cho/payroll-grades?filter[grade]=1&filter[sub_grade]=A')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $grade1AId);

        // Search filter on level_label, grade, sub_grade
        $this->getJson('/api/v1/modules/cho/payroll-grades?filter[search]=manager')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $grade2A->id);

        $this->getJson('/api/v1/modules/cho/payroll-grades?filter[search]=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $grade2A->id);

        $this->getJson('/api/v1/modules/cho/payroll-grades?filter[search]=B&per_page=5&page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $grade1BId)
            ->assertJsonPath('meta.total', 1);

        // Sort + include=employees
        $this->getJson('/api/v1/modules/cho/payroll-grades?sort=-total_company_cost&include=employees')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.id', $grade2A->id)
            ->assertJsonPath('data.1.id', $grade1AId)
            ->assertJsonPath('data.2.id', $grade1BId)
            ->assertJsonPath('data.0.employees.0.id', $managerEmployee->id)
            ->assertJsonPath('data.0.employees.0.payroll_grade_id', $grade2A->id)
            ->assertJsonPath('data.0.employees.0.name', 'Andi Wijaya');

        // Show single item
        $this->getJson("/api/v1/modules/cho/payroll-grades/{$grade1AId}")
            ->assertOk()
            ->assertJsonPath('data.id', $grade1AId)
            ->assertJsonPath('data.grade', 1)
            ->assertJsonPath('data.sub_grade', 'A')
            ->assertJsonPath('data.company.name', 'PT. Foodlab Nusantara');

        // Update (PUT) recomputes derived fields and forgets cache
        $putRes = $this->putJson("/api/v1/modules/cho/payroll-grades/{$grade1BId}", [
            'company_id' => $company->id,
            'grade' => 1,
            'sub_grade' => 'B',
            'level_label' => 'staff senior',
            'base_salary' => 4000000,
            'position_allowance' => 1000000,
        ]);

        $putRes->assertOk()
            ->assertJsonPath('data.level_label', 'staff senior');
        expect((float) $putRes->json('data.total_gross'))->toBe(5000000.0);
        expect((float) $putRes->json('data.bpjs_kesehatan_company'))->toBe(200000.0);
        expect((float) $putRes->json('data.bpjs_kesehatan_employee'))->toBe(50000.0);
        expect((float) $putRes->json('data.bpjs_ketenagakerjaan_company'))->toBe(197000.0);
        expect((float) $putRes->json('data.bpjs_ketenagakerjaan_employee'))->toBe(100000.0);
        expect((float) $putRes->json('data.net_employee_received'))->toBe(4850000.0);
        expect((float) $putRes->json('data.total_company_cost'))->toBe(5397000.0);
        expect(Cache::has(PayrollGradeService::CACHE_KEY_LIST))->toBeFalse();

        // Update (PATCH) partial payload keeps existing position_allowance and recomputes derived fields
        $patchRes = $this->patchJson("/api/v1/modules/cho/payroll-grades/{$grade1BId}", [
            'base_salary' => 7000000,
        ]);

        $patchRes->assertOk()
            ->assertJsonPath('data.grade', 1)
            ->assertJsonPath('data.sub_grade', 'B');
        expect((float) $patchRes->json('data.position_allowance'))->toBe(1000000.0);
        expect((float) $patchRes->json('data.total_gross'))->toBe(8000000.0);
        expect((float) $patchRes->json('data.bpjs_kesehatan_company'))->toBe(320000.0);
        expect((float) $patchRes->json('data.bpjs_kesehatan_employee'))->toBe(80000.0);
        expect((float) $patchRes->json('data.bpjs_ketenagakerjaan_company'))->toBe(315200.0);
        expect((float) $patchRes->json('data.bpjs_ketenagakerjaan_employee'))->toBe(160000.0);
        expect((float) $patchRes->json('data.net_employee_received'))->toBe(7760000.0);
        expect((float) $patchRes->json('data.total_company_cost'))->toBe(8635200.0);

        // Soft delete unused grade
        $this->deleteJson("/api/v1/modules/cho/payroll-grades/{$grade1BId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('payroll_grades', ['id' => $grade1BId]);
        $this->getJson("/api/v1/modules/cho/payroll-grades/{$grade1BId}")->assertNotFound();

        // Re-creating a previously soft-deleted (grade, sub_grade) succeeds
        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $company->id,
            'grade' => 1,
            'sub_grade' => 'B',
            'base_salary' => 4500000,
        ])->assertCreated();
    });

    it('returns 422 on duplicate (grade, sub_grade), invalid/negative values, and soft-delete while referenced by active employees', function () {
        $company = Company::factory()->create();

        $existing = PayrollGrade::factory()->create([
            'company_id' => $company->id,
            'grade' => 1,
            'sub_grade' => 'A',
            'base_salary' => 5000000,
            'position_allowance' => 500000,
        ]);

        $other = PayrollGrade::factory()->create([
            'company_id' => $company->id,
            'grade' => 2,
            'sub_grade' => 'A',
            'base_salary' => 7000000,
            'position_allowance' => 1000000,
        ]);

        // Duplicate (grade, sub_grade) and negative base_salary/position_allowance on store
        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $company->id,
            'grade' => 1,
            'sub_grade' => 'A',
            'base_salary' => 5000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['sub_grade']);

        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $company->id,
            'grade' => 0,
            'sub_grade' => str_repeat('X', 11),
            'level_label' => str_repeat('L', 151),
            'base_salary' => -100,
            'position_allowance' => -50,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['grade', 'sub_grade', 'level_label', 'base_salary', 'position_allowance']);

        // Duplicate (grade, sub_grade) on PUT
        $this->putJson("/api/v1/modules/cho/payroll-grades/{$other->id}", [
            'company_id' => $company->id,
            'grade' => 1,
            'sub_grade' => 'A',
            'base_salary' => 7000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['sub_grade']);

        // Duplicate (grade, sub_grade) on partial PATCH updating only grade
        $this->patchJson("/api/v1/modules/cho/payroll-grades/{$other->id}", [
            'grade' => 1,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['grade']);

        // Soft-deleted company is rejected
        $deletedCompany = Company::factory()->create();
        $deletedCompany->delete();

        $this->postJson('/api/v1/modules/cho/payroll-grades', [
            'company_id' => $deletedCompany->id,
            'grade' => 3,
            'sub_grade' => 'A',
            'base_salary' => 8000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id']);

        // Block soft delete (422) if referenced by active employees
        $employee = Employee::factory()->create([
            'company_id' => $company->id,
            'payroll_grade_id' => $existing->id,
        ]);

        $this->deleteJson("/api/v1/modules/cho/payroll-grades/{$existing->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payroll_grade']);

        $this->assertNotSoftDeleted('payroll_grades', ['id' => $existing->id]);

        // Once referencing employee is soft-deleted, payroll grade can be soft-deleted
        $employee->delete();

        $this->deleteJson("/api/v1/modules/cho/payroll-grades/{$existing->id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('payroll_grades', ['id' => $existing->id]);
    });
});
