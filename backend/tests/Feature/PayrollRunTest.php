<?php

use App\Enums\PayrollRunStatus;
use App\Models\Company;
use App\Models\Employee;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\User;
use App\Modules\CHO\Services\PayrollRunService;
use App\Support\ActiveCompany;
use Illuminate\Support\Facades\Cache;

describe('PayrollRun CHO module', function () {
    beforeEach(function () {
        Cache::flush();
        ActiveCompany::clear();
        actingAsErpUser();
    });

    it('supports CRUD, period normalization, QueryBuilder filters/sorts/includes, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        // Store with non-1st-of-month period_date, padded text, and forged rollup/approval fields
        $createRes = $this->postJson('/api/v1/modules/cho/payroll-runs', [
            'company_id' => $companyA->id,
            'code' => '  PR-2025-11  ',
            'name' => '  Payroll   November   2025  ',
            'period_date' => '2025-11-18',
            'notes' => '  Catatan   awal  ',
            'total_base_salary' => 99999999,
            'total_net' => 99999999,
            'approved_by' => 999,
            'approved_at' => '2020-01-01T00:00:00Z',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'code',
                    'name',
                    'period_date',
                    'status',
                    'total_base_salary',
                    'total_bpjs_kesehatan',
                    'total_bpjs_ketenagakerjaan',
                    'total_bonus',
                    'total_overtime',
                    'total_deduction',
                    'total_thr',
                    'total_pph21',
                    'total_net',
                    'notes',
                    'approved_by',
                    'approved_at',
                    'company',
                    'approver',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonMissingPath('data.items')
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.code', 'PR-2025-11')
            ->assertJsonPath('data.name', 'Payroll November 2025')
            ->assertJsonPath('data.period_date', '2025-11-01')
            ->assertJsonPath('data.status', PayrollRunStatus::DRAFT->value)
            ->assertJsonPath('data.notes', 'Catatan awal')
            ->assertJsonPath('data.approved_by', null)
            ->assertJsonPath('data.approved_at', null);

        expect((float) $createRes->json('data.total_base_salary'))->toBe(0.0);
        expect((float) $createRes->json('data.total_net'))->toBe(0.0);

        $run1Id = $createRes->json('data.id');

        $run2 = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'PR-100%_BONUS',
            'name' => 'Payroll Oktober 2025',
            'period_date' => '2025-10-01',
            'status' => PayrollRunStatus::PENDING,
            'total_net' => 15000000.00,
        ]);

        $run3 = PayrollRun::factory()->create([
            'company_id' => $companyB->id,
            'code' => 'PR-2025-12',
            'name' => 'Payroll Desember 2025 Beta',
            'period_date' => '2025-12-01',
            'status' => PayrollRunStatus::APPROVED,
            'total_net' => 25000000.00,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        $employeeA = Employee::factory()->create(['company_id' => $companyA->id]);
        $itemA = PayrollItem::factory()->create([
            'company_id' => $companyA->id,
            'payroll_run_id' => $run1Id,
            'employee_id' => $employeeA->id,
            'base_salary' => 5000000.00,
            'total_net' => 4850000.00,
        ]);

        // Unfiltered list uses defaultSort(-period_date, -id) and populates cache
        expect(Cache::has(PayrollRunService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/cho/payroll-runs')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', PayrollRunService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $run3->id) // 2025-12-01
            ->assertJsonPath('data.1.id', $run1Id)   // 2025-11-01
            ->assertJsonPath('data.2.id', $run2->id); // 2025-10-01

        expect(Cache::has(PayrollRunService::CACHE_KEY_LIST))->toBeTrue();

        // Filters: company_id, status, period_date, period_from/period_to, search (escaped LIKE & whitespace)
        $this->getJson("/api/v1/modules/cho/payroll-runs?filter[company_id]={$companyA->id}&filter[status]=pending")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $run2->id);

        $this->getJson('/api/v1/modules/cho/payroll-runs?filter[period_date]=2025-11-25')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $run1Id);

        $this->getJson('/api/v1/modules/cho/payroll-runs?filter[period_from]=2025-11-01&filter[period_to]=2025-12-01')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/modules/cho/payroll-runs?filter[search]='.urlencode('100%'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $run2->id);

        $this->getJson('/api/v1/modules/cho/payroll-runs?filter[search]=%20%20%20')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        // ?active_company=1
        $this->getJson('/api/v1/modules/cho/payroll-runs?active_company=1', [
            'X-Active-Company-Id' => (string) $companyB->id,
        ])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $run3->id);

        // Sort + include=items,company,approver
        $this->getJson('/api/v1/modules/cho/payroll-runs?sort=-total_net&include=company,approver,items&per_page=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('data.0.id', $run3->id)
            ->assertJsonPath('data.0.approver.id', auth()->id())
            ->assertJsonPath('data.1.id', $run2->id);

        $this->getJson("/api/v1/modules/cho/payroll-runs?filter[company_id]={$companyA->id}&include=items")
            ->assertOk()
            ->assertJsonPath('data.0.id', $run1Id)
            ->assertJsonPath('data.0.items.0.id', $itemA->id);

        // Show single item
        $this->getJson("/api/v1/modules/cho/payroll-runs/{$run1Id}")
            ->assertOk()
            ->assertJsonPath('data.id', $run1Id)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha');

        // PUT update transitioning draft -> pending
        $this->putJson("/api/v1/modules/cho/payroll-runs/{$run1Id}", [
            'company_id' => $companyA->id,
            'code' => 'PR-2025-11',
            'name' => 'Payroll November 2025 Revisi',
            'period_date' => '2025-11-28',
            'status' => PayrollRunStatus::PENDING->value,
            'notes' => 'Siap disetujui',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Payroll November 2025 Revisi')
            ->assertJsonPath('data.period_date', '2025-11-01')
            ->assertJsonPath('data.status', PayrollRunStatus::PENDING->value)
            ->assertJsonPath('data.approved_by', null);

        expect(Cache::has(PayrollRunService::CACHE_KEY_LIST))->toBeFalse();

        // Partial PATCH transitioning pending -> approved sets approved_by & approved_at
        $approveRes = $this->patchJson("/api/v1/modules/cho/payroll-runs/{$run1Id}", [
            'status' => PayrollRunStatus::APPROVED->value,
        ])->assertOk()
            ->assertJsonPath('data.status', PayrollRunStatus::APPROVED->value)
            ->assertJsonPath('data.name', 'Payroll November 2025 Revisi')
            ->assertJsonPath('data.approved_by', auth()->id());

        $approvedAt = $approveRes->json('data.approved_at');
        expect($approvedAt)->not->toBeNull();

        // Partial PATCH updating notes on approved run preserves approved_by and approved_at
        $anotherUser = User::factory()->create();
        $this->actingAs($anotherUser, 'sanctum');

        $this->patchJson("/api/v1/modules/cho/payroll-runs/{$run1Id}", [
            'notes' => 'Catatan setelah disetujui',
        ])->assertOk()
            ->assertJsonPath('data.notes', 'Catatan setelah disetujui')
            ->assertJsonPath('data.approved_by', $approveRes->json('data.approved_by'))
            ->assertJsonPath('data.approved_at', $approvedAt);
    });

    it('rejects duplicate period/code/name variants, invalid status transitions, and company_id changes while active items exist', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $existing = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'PR-JAN-26',
            'name' => 'Payroll Januari 2026',
            'period_date' => '2026-01-01',
            'status' => PayrollRunStatus::DRAFT,
        ]);

        $other = PayrollRun::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'PR-FEB-26',
            'name' => 'Payroll Februari 2026',
            'period_date' => '2026-02-01',
            'status' => PayrollRunStatus::APPROVED,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        // Duplicate period_date (different day in same month), code (case + spaces), name (case + spaces)
        $this->postJson('/api/v1/modules/cho/payroll-runs', [
            'company_id' => $companyA->id,
            'code' => '  pr-jan-26 ',
            'name' => '  payroll   januari   2026 ',
            'period_date' => '2026-01-25',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['period_date', 'code', 'name']);

        // Duplicate name even when code is null
        $this->postJson('/api/v1/modules/cho/payroll-runs', [
            'company_id' => $companyA->id,
            'code' => null,
            'name' => 'payroll januari 2026',
            'period_date' => '2026-03-01',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        // Same period_date, code, and name allowed in a different company
        $this->postJson('/api/v1/modules/cho/payroll-runs', [
            'company_id' => $companyB->id,
            'code' => 'PR-JAN-26',
            'name' => 'Payroll Januari 2026',
            'period_date' => '2026-01-01',
        ])->assertCreated();

        // Creating directly as void is rejected
        $this->postJson('/api/v1/modules/cho/payroll-runs', [
            'company_id' => $companyA->id,
            'name' => 'Payroll Void Direct',
            'period_date' => '2026-04-01',
            'status' => PayrollRunStatus::VOID->value,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        // Invalid status transitions: approved -> draft/pending rejected; approved -> void allowed; void -> any non-void rejected
        $this->patchJson("/api/v1/modules/cho/payroll-runs/{$other->id}", [
            'status' => PayrollRunStatus::DRAFT->value,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->patchJson("/api/v1/modules/cho/payroll-runs/{$other->id}", [
            'status' => PayrollRunStatus::PENDING->value,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->patchJson("/api/v1/modules/cho/payroll-runs/{$other->id}", [
            'status' => PayrollRunStatus::VOID->value,
        ])->assertOk()
            ->assertJsonPath('data.status', PayrollRunStatus::VOID->value);

        $this->patchJson("/api/v1/modules/cho/payroll-runs/{$other->id}", [
            'status' => PayrollRunStatus::APPROVED->value,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        // Reassigning company_id while active payroll_items exist fails with 422
        $employee = Employee::factory()->create(['company_id' => $companyA->id]);
        $item = PayrollItem::factory()->create([
            'company_id' => $companyA->id,
            'payroll_run_id' => $existing->id,
            'employee_id' => $employee->id,
        ]);

        $this->patchJson("/api/v1/modules/cho/payroll-runs/{$existing->id}", [
            'company_id' => $companyB->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['company_id']);

        // Soft-deleting the payroll run cascades soft-delete to payroll_items and clears caches
        $this->getJson('/api/v1/modules/cho/payroll-runs')->assertOk();
        expect(Cache::has(PayrollRunService::CACHE_KEY_LIST))->toBeTrue();

        $this->deleteJson("/api/v1/modules/cho/payroll-runs/{$existing->id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('payroll_runs', ['id' => $existing->id]);
        $this->assertSoftDeleted('payroll_items', ['id' => $item->id]);
        expect(Cache::has(PayrollRunService::CACHE_KEY_LIST))->toBeFalse();

        // Re-creating after soft delete succeeds
        $this->postJson('/api/v1/modules/cho/payroll-runs', [
            'company_id' => $companyA->id,
            'code' => 'PR-JAN-26',
            'name' => 'Payroll Januari 2026',
            'period_date' => '2026-01-01',
        ])->assertCreated();
    });
});
