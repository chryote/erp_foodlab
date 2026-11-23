<?php

use App\Enums\PayrollGroup;
use App\Enums\PayrollRunStatus;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Modules\CHO\Services\PayrollItemService;
use App\Modules\CHO\Services\PayrollRunService;
use App\Support\ActiveCompany;
use Illuminate\Support\Facades\Cache;

describe('PayrollItem CHO module', function () {
    beforeEach(function () {
        Cache::flush();
        ActiveCompany::clear();
        actingAsErpUser();
    });

    it('supports CRUD (PUT + partial PATCH), server-computed total_net, parent payroll_run rollups, QueryBuilder filters/sorts/includes, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'CV Area 31']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        $posArea = EmployeePosition::factory()->create(['name' => 'Kepala Area']);
        $posOutlet = EmployeePosition::factory()->create(['name' => 'Outlet']);
        $posB = EmployeePosition::factory()->create(['name' => 'SPV']);

        $runA1 = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'period_date' => '2025-11-01',
            'status' => PayrollRunStatus::DRAFT,
        ]);
        $runA2 = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'period_date' => '2025-12-01',
            'status' => PayrollRunStatus::PENDING,
        ]);
        $runB = PayrollRun::factory()->create([
            'company_id' => $companyB->id,
            'period_date' => '2025-12-01',
            'status' => PayrollRunStatus::DRAFT,
        ]);

        $empA1 = Employee::factory()->create([
            'company_id' => $companyA->id,
            'employee_position_id' => $posArea->id,
            'name' => 'Raka Pratama',
        ]);
        $empA2 = Employee::factory()->create([
            'company_id' => $companyA->id,
            'employee_position_id' => $posOutlet->id,
            'name' => 'Larasati 100%_Outlet',
        ]);
        $empB = Employee::factory()->create([
            'company_id' => $companyB->id,
            'employee_position_id' => $posB->id,
            'name' => 'Budi Beta',
        ]);

        // Store office item with padded text and forged total_net
        $createRes = $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $runA1->id,
            'employee_id' => $empA1->id,
            'employee_position_id' => $posArea->id,
            'payroll_group' => PayrollGroup::OFFICE->value,
            'bank_account_number' => '  1310   004500112  ',
            'base_salary' => 7500000,
            'bpjs_kesehatan' => 75000,
            'bpjs_ketenagakerjaan' => 150000,
            'bonus' => 1000000,
            'overtime' => 250000,
            'deduction' => 200000,
            'thr' => 500000,
            'pph21' => 325000,
            'total_net' => 99999999,
            'notes' => '  Catatan   office  ',
        ]);

        // total_net = (7500000 + 1000000 + 250000 + 500000) - (75000 + 150000 + 200000 + 325000) = 9250000 - 750000 = 8500000
        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'payroll_run_id',
                    'employee_id',
                    'employee_position_id',
                    'payroll_group',
                    'bank_account_number',
                    'base_salary',
                    'bpjs_kesehatan',
                    'bpjs_ketenagakerjaan',
                    'bonus',
                    'overtime',
                    'deduction',
                    'thr',
                    'pph21',
                    'total_net',
                    'notes',
                    'company',
                    'payroll_run',
                    'employee',
                    'employee_position',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.payroll_run_id', $runA1->id)
            ->assertJsonPath('data.employee_id', $empA1->id)
            ->assertJsonPath('data.employee_position_id', $posArea->id)
            ->assertJsonPath('data.payroll_group', PayrollGroup::OFFICE->value)
            ->assertJsonPath('data.bank_account_number', '1310 004500112')
            ->assertJsonPath('data.notes', 'Catatan office');

        expect((float) $createRes->json('data.total_net'))->toBe(8500000.0);

        $itemA1Id = $createRes->json('data.id');

        // Store outlet item with base_salary only and whitespace-only bank_account_number -> null
        $createOutletRes = $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $runA1->id,
            'employee_id' => $empA2->id,
            'employee_position_id' => $posOutlet->id,
            'payroll_group' => PayrollGroup::OUTLET->value,
            'bank_account_number' => '   ',
            'base_salary' => 3000000,
        ]);

        $createOutletRes->assertCreated()
            ->assertJsonPath('data.payroll_group', PayrollGroup::OUTLET->value)
            ->assertJsonPath('data.bank_account_number', null);
        expect((float) $createOutletRes->json('data.total_net'))->toBe(3000000.0);

        $itemA2Id = $createOutletRes->json('data.id');

        // Verify parent payroll_runs.total_* rollups updated accurately
        $runA1->refresh();
        expect((float) $runA1->total_base_salary)->toBe(10500000.0);
        expect((float) $runA1->total_bpjs_kesehatan)->toBe(75000.0);
        expect((float) $runA1->total_bpjs_ketenagakerjaan)->toBe(150000.0);
        expect((float) $runA1->total_bonus)->toBe(1000000.0);
        expect((float) $runA1->total_overtime)->toBe(250000.0);
        expect((float) $runA1->total_deduction)->toBe(200000.0);
        expect((float) $runA1->total_thr)->toBe(500000.0);
        expect((float) $runA1->total_pph21)->toBe(325000.0);
        expect((float) $runA1->total_net)->toBe(11500000.0);

        // Item in Company B
        $itemBRes = $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyB->id,
            'payroll_run_id' => $runB->id,
            'employee_id' => $empB->id,
            'employee_position_id' => $posB->id,
            'payroll_group' => PayrollGroup::OFFICE->value,
            'bank_account_number' => '999-100%_ACC',
            'base_salary' => 6000000,
        ])->assertCreated();
        $itemBId = $itemBRes->json('data.id');

        // Unfiltered list uses defaultSort('payroll_group', 'id') and populates cache
        expect(Cache::has(PayrollItemService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cho/payroll-items')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', PayrollItemService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $itemA1Id) // office, lower id
            ->assertJsonPath('data.1.id', $itemBId)  // office, higher id
            ->assertJsonPath('data.2.id', $itemA2Id); // outlet

        expect(Cache::has(PayrollItemService::CACHE_KEY_LIST))->toBeTrue();

        // Filters: company_id, payroll_run_id, employee_id, employee_position_id, payroll_group, search
        $this->getJson("/api/v1/modules/cho/payroll-items?filter[company_id]={$companyA->id}&filter[payroll_group]=outlet")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemA2Id);

        $this->getJson("/api/v1/modules/cho/payroll-items?filter[payroll_run_id]={$runA1->id}&filter[employee_id]={$empA1->id}&filter[employee_position_id]={$posArea->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemA1Id);

        // Search matches bank_account_number and employee.name with escaped LIKE wildcards
        $this->getJson('/api/v1/modules/cho/payroll-items?filter[search]='.urlencode('100%_Outlet'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemA2Id);

        $this->getJson('/api/v1/modules/cho/payroll-items?filter[search]=004500112')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemA1Id);

        // Whitespace-only search does not filter out records
        $this->getJson('/api/v1/modules/cho/payroll-items?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // ?active_company=1
        $this->getJson('/api/v1/modules/cho/payroll-items?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $itemBId);

        // Sorts & includes & pagination
        $this->getJson('/api/v1/modules/cho/payroll-items?sort=-total_net&include=company,payrollRun,employee,employeePosition&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('data.0.id', $itemA1Id)
            ->assertJsonPath('data.0.employee.name', 'Raka Pratama')
            ->assertJsonPath('data.0.employee_position.name', 'Kepala Area')
            ->assertJsonPath('data.1.id', $itemBId);

        // Show single item
        $this->getJson("/api/v1/modules/cho/payroll-items/{$itemA1Id}")
            ->assertOk()
            ->assertJsonPath('data.id', $itemA1Id)
            ->assertJsonPath('data.company.name', 'CV Area 31')
            ->assertJsonPath('data.payroll_run.id', $runA1->id);

        // Partial PATCH updates bonus only, preserves omitted fields, recomputes total_net & parent rollups, invalidates caches
        $patchRes = $this->patchJson("/api/v1/modules/cho/payroll-items/{$itemA1Id}", [
            'bonus' => 2000000,
        ]);

        // New total_net = (7500000 + 2000000 + 250000 + 500000) - 750000 = 9500000
        $patchRes->assertOk()
            ->assertJsonPath('data.bank_account_number', '1310 004500112');
        expect((float) $patchRes->json('data.base_salary'))->toBe(7500000.0);
        expect((float) $patchRes->json('data.total_net'))->toBe(9500000.0);
        expect(Cache::has(PayrollItemService::CACHE_KEY_LIST))->toBeFalse();
        expect(Cache::has(PayrollRunService::CACHE_KEY_LIST))->toBeFalse();

        $runA1->refresh();
        expect((float) $runA1->total_bonus)->toBe(2000000.0);
        expect((float) $runA1->total_net)->toBe(12500000.0);

        // PUT update moving outlet item to $runA2 (pending) recalculates BOTH $runA1 and $runA2 rollups
        $putRes = $this->putJson("/api/v1/modules/cho/payroll-items/{$itemA2Id}", [
            'company_id' => $companyA->id,
            'payroll_run_id' => $runA2->id,
            'employee_id' => $empA2->id,
            'employee_position_id' => $posOutlet->id,
            'payroll_group' => PayrollGroup::OUTLET->value,
            'bank_account_number' => null,
            'base_salary' => 3500000,
            'deduction' => 100000,
        ]);

        $putRes->assertOk()
            ->assertJsonPath('data.payroll_run_id', $runA2->id);
        expect((float) $putRes->json('data.total_net'))->toBe(3400000.0);

        $runA1->refresh();
        $runA2->refresh();
        expect((float) $runA1->total_base_salary)->toBe(7500000.0);
        expect((float) $runA1->total_net)->toBe(9500000.0);
        expect((float) $runA2->total_base_salary)->toBe(3500000.0);
        expect((float) $runA2->total_deduction)->toBe(100000.0);
        expect((float) $runA2->total_net)->toBe(3400000.0);

        // Soft delete recalculates parent rollup and clears cache
        $this->getJson('/api/v1/modules/cho/payroll-items')->assertOk();
        expect(Cache::has(PayrollItemService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cho/payroll-items/{$itemA1Id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('payroll_items', ['id' => $itemA1Id]);
        expect(Cache::has(PayrollItemService::CACHE_KEY_LIST))->toBeFalse();

        $runA1->refresh();
        expect((float) $runA1->total_base_salary)->toBe(0.0);
        expect((float) $runA1->total_net)->toBe(0.0);

        // ChoController /enums exposes payroll_group
        $this->getJson('/api/v1/modules/cho/enums')
            ->assertOk()
            ->assertJsonPath('data.payroll_group.0.value', 'office')
            ->assertJsonPath('data.payroll_group.1.value', 'outlet');
    });

    it('enforces 422 validation rules: bounds, cross-company FKs, approved/void run lock, active duplicates, and re-create after soft delete', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $posA = EmployeePosition::factory()->create();
        $posB = EmployeePosition::factory()->create();
        $deletedPos = EmployeePosition::factory()->create();
        $deletedPos->delete();

        $empA1 = Employee::factory()->create(['company_id' => $companyA->id, 'employee_position_id' => $posA->id]);
        $empA2 = Employee::factory()->create(['company_id' => $companyA->id, 'employee_position_id' => $posA->id]);
        $empB = Employee::factory()->create(['company_id' => $companyB->id, 'employee_position_id' => $posB->id]);

        $draftRunA = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'period_date' => '2026-01-01',
            'status' => PayrollRunStatus::DRAFT,
        ]);
        $approvedRunA = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'period_date' => '2026-02-01',
            'status' => PayrollRunStatus::APPROVED,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);
        $voidRunA = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'period_date' => '2026-03-01',
            'status' => PayrollRunStatus::VOID,
        ]);
        $draftRunB = PayrollRun::factory()->create([
            'company_id' => $companyB->id,
            'period_date' => '2026-01-01',
            'status' => PayrollRunStatus::DRAFT,
        ]);

        // 1. Numeric bounds: negative, >2 decimals, > max decimal(18,2), negative computed total_net, overflow computed total_net
        $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunA->id,
            'employee_id' => $empA1->id,
            'base_salary' => -100,
            'bonus' => 100.123,
            'pph21' => 99999999999999999.00,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['base_salary', 'bonus', 'pph21']);

        $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunA->id,
            'employee_id' => $empA1->id,
            'base_salary' => 1000000,
            'deduction' => 1500000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['total_net']);

        $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunA->id,
            'employee_id' => $empA1->id,
            'base_salary' => 5000000000000000.00,
            'bonus' => 5000000000000000.00,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['total_net']);

        // 2. Cross-company FK mismatches & soft-deleted position fail with 422
        $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunB->id,
            'employee_id' => $empB->id,
            'employee_position_id' => $deletedPos->id,
            'base_salary' => 5000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['payroll_run_id', 'employee_id', 'employee_position_id']);

        // 3. Creating item under approved or void run fails with 422
        $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $approvedRunA->id,
            'employee_id' => $empA1->id,
            'base_salary' => 5000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['payroll_run_id']);

        $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $voidRunA->id,
            'employee_id' => $empA1->id,
            'base_salary' => 5000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['payroll_run_id']);

        // 4. Create valid items in draftRunA, verify duplicate rejection and partial PATCH cross-company rejection
        $first = $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunA->id,
            'employee_id' => $empA1->id,
            'employee_position_id' => $posA->id,
            'base_salary' => 5000000,
        ])->assertCreated();

        $second = $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunA->id,
            'employee_id' => $empA2->id,
            'employee_position_id' => $posA->id,
            'base_salary' => 4000000,
        ])->assertCreated();

        // Duplicate (company_id, payroll_run_id, employee_id) on POST & PATCH
        $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunA->id,
            'employee_id' => $empA1->id,
            'base_salary' => 5000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_id']);

        $secondId = $second->json('data.id');
        $this->patchJson("/api/v1/modules/cho/payroll-items/{$secondId}", [
            'employee_id' => $empA1->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_id']);

        // Partial PATCH changing company_id without updating company-scoped FKs fails with 422
        $this->patchJson("/api/v1/modules/cho/payroll-items/{$secondId}", [
            'company_id' => $companyB->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['payroll_run_id', 'employee_id']);

        // 5. Mutating/deleting items after parent run is approved is rejected with 422
        $firstId = $first->json('data.id');
        $draftRunA->update(['status' => PayrollRunStatus::APPROVED, 'approved_by' => auth()->id(), 'approved_at' => now()]);

        $this->patchJson("/api/v1/modules/cho/payroll-items/{$firstId}", [
            'bonus' => 500000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['payroll_run_id']);

        $this->deleteJson("/api/v1/modules/cho/payroll-items/{$firstId}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payroll_run_id']);

        // Re-test soft delete & re-create on a fresh draft run
        $draftRunA2 = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'period_date' => '2026-04-01',
            'status' => PayrollRunStatus::DRAFT,
        ]);

        $recreatable = $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunA2->id,
            'employee_id' => $empA1->id,
            'base_salary' => 5000000,
        ])->assertCreated();

        $this->deleteJson('/api/v1/modules/cho/payroll-items/'.$recreatable->json('data.id'))->assertOk();
        $this->assertSoftDeleted('payroll_items', ['id' => $recreatable->json('data.id')]);

        $this->postJson('/api/v1/modules/cho/payroll-items', [
            'company_id' => $companyA->id,
            'payroll_run_id' => $draftRunA2->id,
            'employee_id' => $empA1->id,
            'base_salary' => 5250000,
        ])->assertCreated()
            ->assertJsonPath('data.total_net', 5250000);
    });
});
