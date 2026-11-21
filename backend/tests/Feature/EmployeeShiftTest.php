<?php

use App\Enums\ShiftStatusEnum;
use App\Models\Company;
use App\Models\EmployeeShift;
use App\Modules\HR\Services\EmployeeShiftService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;

describe('EmployeeShift HR module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, QueryBuilder filtering/sorting/includes, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        // Create regular shift via FormRequest + DB::transaction
        $createRes = $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $companyA->id,
            'code' => 'SHIFT-PAGI',
            'name' => 'Shift Pagi Lab',
            'start_time' => '07:00',
            'end_time' => '15:00',
            'break_minutes' => 60,
            'grace_period_minutes' => 15,
            'is_overnight' => false,
            'status' => ShiftStatusEnum::ACTIVE->value,
            'description' => 'Shift operasional pagi',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'code',
                    'name',
                    'start_time',
                    'end_time',
                    'break_minutes',
                    'grace_period_minutes',
                    'is_overnight',
                    'status',
                    'description',
                    'company',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                ],
            ])
            ->assertJsonMissingPath('data.active_flag')
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.code', 'SHIFT-PAGI')
            ->assertJsonPath('data.name', 'Shift Pagi Lab')
            ->assertJsonPath('data.start_time', '07:00:00')
            ->assertJsonPath('data.end_time', '15:00:00')
            ->assertJsonPath('data.break_minutes', 60)
            ->assertJsonPath('data.grace_period_minutes', 15)
            ->assertJsonPath('data.is_overnight', false)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.description', 'Shift operasional pagi');

        $morningId = $createRes->json('data.id');

        // Create overnight shift (end_time < start_time allowed when is_overnight = true)
        $overnightRes = $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $companyA->id,
            'code' => 'SHIFT-MALAM',
            'name' => 'Shift Malam Lab',
            'start_time' => '22:00:00',
            'end_time' => '06:00:00',
            'is_overnight' => true,
            'status' => ShiftStatusEnum::INACTIVE->value,
        ]);

        $overnightRes->assertCreated()
            ->assertJsonPath('data.is_overnight', true)
            ->assertJsonPath('data.status', 'inactive')
            ->assertJsonPath('data.break_minutes', 0)
            ->assertJsonPath('data.grace_period_minutes', 0);

        $overnightId = $overnightRes->json('data.id');

        $otherCompanyShift = EmployeeShift::factory()->create([
            'company_id' => $companyB->id,
            'code' => 'SHIFT-PAGI',
            'name' => 'Shift Beta',
            'start_time' => '08:00:00',
            'end_time' => '16:00:00',
            'is_overnight' => false,
            'status' => ShiftStatusEnum::ACTIVE,
        ]);

        // Unfiltered list populates cache and defaults sort by start_time, id
        expect(Cache::has(EmployeeShiftService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/hr/employee-shifts')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', EmployeeShiftService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $morningId)
            ->assertJsonPath('data.1.id', $otherCompanyShift->id)
            ->assertJsonPath('data.2.id', $overnightId);

        expect(Cache::has(EmployeeShiftService::CACHE_KEY_LIST))->toBeTrue();

        // Filters: company_id, code, name, status, is_overnight + sort + include
        $this->getJson("/api/v1/modules/hr/employee-shifts?filter[company_id]={$companyA->id}&sort=-code&include=company")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $morningId) // SHIFT-PAGI > SHIFT-MALAM
            ->assertJsonPath('data.1.id', $overnightId)
            ->assertJsonPath('data.0.company.name', 'PT. Foodlab Alpha');

        $this->getJson('/api/v1/modules/hr/employee-shifts?filter[code]=MALAM')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $overnightId);

        $this->getJson('/api/v1/modules/hr/employee-shifts?filter[name]=Beta')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $otherCompanyShift->id);

        $this->getJson('/api/v1/modules/hr/employee-shifts?filter[status]=inactive')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $overnightId);

        $this->getJson('/api/v1/modules/hr/employee-shifts?filter[is_overnight]=true')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $overnightId);

        $this->getJson('/api/v1/modules/hr/employee-shifts?filter[is_overnight]=0&sort=start_time')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $morningId)
            ->assertJsonPath('data.1.id', $otherCompanyShift->id);

        // Show single item
        $this->getJson("/api/v1/modules/hr/employee-shifts/{$morningId}")
            ->assertOk()
            ->assertJsonPath('data.id', $morningId)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha');

        // Update (PUT) clears cache
        $this->putJson("/api/v1/modules/hr/employee-shifts/{$morningId}", [
            'company_id' => $companyA->id,
            'code' => 'SHIFT-PAGI',
            'name' => 'Shift Pagi Utama',
            'start_time' => '07:30',
            'end_time' => '16:30',
            'break_minutes' => 45,
            'grace_period_minutes' => 10,
            'is_overnight' => false,
            'status' => ShiftStatusEnum::ACTIVE->value,
            'description' => 'Updated morning shift',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Shift Pagi Utama')
            ->assertJsonPath('data.start_time', '07:30:00')
            ->assertJsonPath('data.end_time', '16:30:00')
            ->assertJsonPath('data.break_minutes', 45);

        expect(Cache::has(EmployeeShiftService::CACHE_KEY_LIST))->toBeFalse();

        // Update (PATCH) partial payload
        $this->patchJson("/api/v1/modules/hr/employee-shifts/{$morningId}", [
            'status' => ShiftStatusEnum::INACTIVE->value,
        ])->assertOk()
            ->assertJsonPath('data.code', 'SHIFT-PAGI')
            ->assertJsonPath('data.status', 'inactive');

        // Soft delete
        $this->deleteJson("/api/v1/modules/hr/employee-shifts/{$morningId}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('employee_shifts', ['id' => $morningId]);
        $this->getJson("/api/v1/modules/hr/employee-shifts/{$morningId}")->assertNotFound();
    });

    it('rejects invalid time rules, invalid enum status, and duplicate active code with 422, and allows re-create after soft delete', function () {
        $company = Company::factory()->create();

        // 1. Overnight time rule: end_time <= start_time fails when is_overnight is false
        $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'code' => 'SHF-DAY',
            'name' => 'Invalid Day Shift',
            'start_time' => '17:00',
            'end_time' => '08:00',
            'is_overnight' => false,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['end_time']);

        // Equal start_time and end_time also fails when not overnight
        $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'code' => 'SHF-EQ',
            'name' => 'Equal Time Shift',
            'start_time' => '08:00',
            'end_time' => '08:00',
            'is_overnight' => false,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['end_time']);

        // Invalid status enum & invalid time format
        $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'name' => 'Bad Shift',
            'start_time' => '25:00',
            'end_time' => '99:99',
            'status' => 'archived',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['start_time', 'end_time', 'status']);

        // 2. Create active shift with code SHIFT-01
        $first = $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'code' => 'SHIFT-01',
            'name' => 'Shift Satu',
            'start_time' => '08:00',
            'end_time' => '17:00',
        ])->assertCreated();

        $firstId = $first->json('data.id');

        // PATCH toggling is_overnight=false on an overnight shift must also enforce end_time > start_time
        $overnight = $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'code' => 'SHIFT-NIGHT',
            'name' => 'Shift Malam',
            'start_time' => '22:00',
            'end_time' => '06:00',
            'is_overnight' => true,
        ])->assertCreated();

        $this->patchJson('/api/v1/modules/hr/employee-shifts/'.$overnight->json('data.id'), [
            'is_overnight' => false,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['end_time']);

        // 3. Active duplicate code in same company rejected with 422
        $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'code' => 'SHIFT-01',
            'name' => 'Shift Duplikat',
            'start_time' => '09:00',
            'end_time' => '18:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        // DB-level unique constraint also rejects active duplicates directly
        expect(fn () => EmployeeShift::factory()->create([
            'company_id' => $company->id,
            'code' => 'SHIFT-01',
        ]))->toThrow(QueryException::class);

        // 4. Multiple nullable codes allowed without collision
        $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'code' => null,
            'name' => 'Shift Tanpa Kode 1',
            'start_time' => '08:00',
            'end_time' => '12:00',
        ])->assertCreated()
            ->assertJsonPath('data.code', null);

        $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'code' => '   ',
            'name' => 'Shift Tanpa Kode 2',
            'start_time' => '13:00',
            'end_time' => '17:00',
        ])->assertCreated()
            ->assertJsonPath('data.code', null);

        // 5. Soft delete SHIFT-01, then re-create SHIFT-01 in the same company
        $this->deleteJson("/api/v1/modules/hr/employee-shifts/{$firstId}")
            ->assertOk();

        $this->assertSoftDeleted('employee_shifts', ['id' => $firstId]);

        $recreated = $this->postJson('/api/v1/modules/hr/employee-shifts', [
            'company_id' => $company->id,
            'code' => 'SHIFT-01',
            'name' => 'Shift Satu Reborn',
            'start_time' => '08:00',
            'end_time' => '17:00',
        ])->assertCreated()
            ->assertJsonPath('data.code', 'SHIFT-01')
            ->assertJsonPath('data.name', 'Shift Satu Reborn');

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });
});
