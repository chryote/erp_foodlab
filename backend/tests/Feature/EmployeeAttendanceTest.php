<?php

use App\Enums\AttendanceStatusEnum;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeePosition;
use App\Models\EmployeeShift;
use App\Models\EmployeeShiftAssignment;
use App\Modules\HR\Actions\RecordAttendanceAction;
use App\Modules\HR\Services\EmployeeAttendanceService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;

describe('EmployeeAttendance HR module', function () {
    beforeEach(function () {
        Cache::flush();
        actingAsErpUser();
    });

    it('supports CRUD, computed late/overtime metrics, QueryBuilder filtering/sorting/includes, caching, and JsonResource structure', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Alpha']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Beta']);

        $employeeA1 = Employee::factory()->create(['company_id' => $companyA->id, 'name' => 'Nadia Putri']);
        $employeeA2 = Employee::factory()->create(['company_id' => $companyA->id, 'name' => 'Budi Santoso']);
        $employeeB1 = Employee::factory()->create(['company_id' => $companyB->id, 'name' => 'Citra Lestari']);

        $morningShiftA = EmployeeShift::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'SHIFT-PAGI',
            'name' => 'Shift Pagi',
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'grace_period_minutes' => 15,
            'is_overnight' => false,
        ]);

        $nightShiftA = EmployeeShift::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'SHIFT-MALAM',
            'name' => 'Shift Malam',
            'start_time' => '22:00:00',
            'end_time' => '06:00:00',
            'grace_period_minutes' => 10,
            'is_overnight' => true,
        ]);

        $shiftB = EmployeeShift::factory()->create([
            'company_id' => $companyB->id,
            'code' => 'SHIFT-BETA',
            'name' => 'Shift Beta',
            'start_time' => '09:00:00',
            'end_time' => '18:00:00',
            'grace_period_minutes' => 15,
            'is_overnight' => false,
        ]);

        // 1. Create attendance within grace period (08:10 <= 08:15) + 45m overtime (17:45 vs 17:00)
        $createRes = $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA1->id,
            'employee_shift_id' => $morningShiftA->id,
            'attendance_date' => '2026-11-20',
            'clock_in_at' => '2026-11-20 08:10:00',
            'clock_out_at' => '2026-11-20 17:45:00',
            'status' => AttendanceStatusEnum::PRESENT->value,
            'notes' => 'Hadir dalam toleransi',
        ]);

        $createRes->assertCreated()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'employee_id',
                    'employee_shift_id',
                    'attendance_date',
                    'clock_in_at',
                    'clock_out_at',
                    'late_minutes',
                    'overtime_minutes',
                    'status',
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
            ->assertJsonPath('data.attendance_date', '2026-11-20')
            ->assertJsonPath('data.late_minutes', 0)
            ->assertJsonPath('data.overtime_minutes', 45)
            ->assertJsonPath('data.status', 'present')
            ->assertJsonPath('data.notes', 'Hadir dalam toleransi');

        $attendance1Id = $createRes->json('data.id');

        // 2. Create overnight shift attendance past grace period (22:25 vs 22:00 + 10m = 15m late, 06:30 vs 06:00 = 30m overtime)
        $overnightRes = $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA2->id,
            'employee_shift_id' => $nightShiftA->id,
            'attendance_date' => '2026-11-21',
            'clock_in_at' => '2026-11-21 22:25:00',
            'clock_out_at' => '2026-11-22 06:30:00',
            'status' => AttendanceStatusEnum::LATE->value,
        ]);

        $overnightRes->assertCreated()
            ->assertJsonPath('data.late_minutes', 15)
            ->assertJsonPath('data.overtime_minutes', 30)
            ->assertJsonPath('data.status', 'late');

        $attendance2Id = $overnightRes->json('data.id');

        // 3. Create company B attendance without shift (defaults to present, 0/0)
        $attendance3Res = $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'company_id' => $companyB->id,
            'employee_id' => $employeeB1->id,
            'employee_shift_id' => $shiftB->id,
            'attendance_date' => '2026-11-19',
            'clock_in_at' => '2026-11-19 09:35:00',
            'clock_out_at' => '2026-11-19 18:00:00',
            'status' => AttendanceStatusEnum::LATE->value,
        ])->assertCreated()
            ->assertJsonPath('data.late_minutes', 20)
            ->assertJsonPath('data.overtime_minutes', 0);

        $attendance3Id = $attendance3Res->json('data.id');

        // Unfiltered list populates cache and defaults sort by -attendance_date, -id
        expect(Cache::has(EmployeeAttendanceService::CACHE_KEY_LIST))->toBeFalse();

        $this->getJson('/api/v1/modules/hr/employee-attendances')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.cache_key', EmployeeAttendanceService::CACHE_KEY_LIST)
            ->assertJsonPath('data.0.id', $attendance2Id)
            ->assertJsonPath('data.1.id', $attendance1Id)
            ->assertJsonPath('data.2.id', $attendance3Id);

        expect(Cache::has(EmployeeAttendanceService::CACHE_KEY_LIST))->toBeTrue();

        // Filters: company_id, employee_id, employee_shift_id, attendance_date, status + sorts + includes
        $this->getJson("/api/v1/modules/hr/employee-attendances?filter[company_id]={$companyA->id}&sort=-overtime_minutes&include=company,employee,employeeShift")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $attendance1Id)
            ->assertJsonPath('data.1.id', $attendance2Id)
            ->assertJsonPath('data.0.company.name', 'PT. Foodlab Alpha')
            ->assertJsonPath('data.0.employee.name', 'Nadia Putri')
            ->assertJsonPath('data.0.employee_shift.code', 'SHIFT-PAGI');

        $this->getJson("/api/v1/modules/hr/employee-attendances?filter[employee_id]={$employeeA2->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $attendance2Id);

        $this->getJson("/api/v1/modules/hr/employee-attendances?filter[employee_shift_id]={$nightShiftA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $attendance2Id);

        $this->getJson('/api/v1/modules/hr/employee-attendances?filter[attendance_date]=2026-11-19')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $attendance3Id);

        $this->getJson('/api/v1/modules/hr/employee-attendances?filter[status]=late&sort=late_minutes')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $attendance2Id)
            ->assertJsonPath('data.1.id', $attendance3Id);

        $this->getJson('/api/v1/modules/hr/employee-attendances?sort=attendance_date')
            ->assertOk()
            ->assertJsonPath('data.0.id', $attendance3Id)
            ->assertJsonPath('data.1.id', $attendance1Id)
            ->assertJsonPath('data.2.id', $attendance2Id);

        $this->getJson('/api/v1/modules/hr/employee-attendances?sort=clock_in_at')
            ->assertOk()
            ->assertJsonPath('data.0.id', $attendance3Id)
            ->assertJsonPath('data.1.id', $attendance1Id)
            ->assertJsonPath('data.2.id', $attendance2Id);

        // Show single item
        $this->getJson("/api/v1/modules/hr/employee-attendances/{$attendance1Id}")
            ->assertOk()
            ->assertJsonPath('data.id', $attendance1Id)
            ->assertJsonPath('data.company.name', 'PT. Foodlab Alpha')
            ->assertJsonPath('data.employee.name', 'Nadia Putri')
            ->assertJsonPath('data.employee_shift.code', 'SHIFT-PAGI');

        // PUT update recomputes late_minutes and overtime_minutes and clears cache
        $this->putJson("/api/v1/modules/hr/employee-attendances/{$attendance1Id}", [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA1->id,
            'employee_shift_id' => $morningShiftA->id,
            'attendance_date' => '2026-11-20',
            'clock_in_at' => '2026-11-20 08:30:00',
            'clock_out_at' => '2026-11-20 18:00:00',
            'status' => AttendanceStatusEnum::LATE->value,
            'notes' => 'Terlambat dan lembur',
        ])->assertOk()
            ->assertJsonPath('data.late_minutes', 15)
            ->assertJsonPath('data.overtime_minutes', 60)
            ->assertJsonPath('data.status', 'late');

        expect(Cache::has(EmployeeAttendanceService::CACHE_KEY_LIST))->toBeFalse();

        // PATCH partial update recomputes overtime_minutes from existing shift & clock_in_at
        $this->patchJson("/api/v1/modules/hr/employee-attendances/{$attendance1Id}", [
            'clock_out_at' => '2026-11-20 18:15:00',
        ])->assertOk()
            ->assertJsonPath('data.late_minutes', 15)
            ->assertJsonPath('data.overtime_minutes', 75);

        // Soft delete
        $this->deleteJson("/api/v1/modules/hr/employee-attendances/{$attendance1Id}")
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertSoftDeleted('employee_attendances', ['id' => $attendance1Id]);
        $this->getJson("/api/v1/modules/hr/employee-attendances/{$attendance1Id}")->assertNotFound();
    });

    it('rejects cross-company employee/shift, invalid clock-out time, invalid enum, and active duplicates with 422, and allows re-create after soft delete', function () {
        $companyA = Company::factory()->create();
        $companyB = Company::factory()->create();

        $employeeA = Employee::factory()->create(['company_id' => $companyA->id]);
        $employeeB = Employee::factory()->create(['company_id' => $companyB->id]);

        $shiftA = EmployeeShift::factory()->create(['company_id' => $companyA->id]);
        $shiftB = EmployeeShift::factory()->create(['company_id' => $companyB->id]);

        // 1. Cross-company employee_id and employee_shift_id fail validation with 422
        $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeB->id,
            'employee_shift_id' => $shiftB->id,
            'attendance_date' => '2026-11-21',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_id', 'employee_shift_id']);

        // 2. clock_out_at < clock_in_at and invalid status enum fail validation with 422
        $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'attendance_date' => '2026-11-21',
            'clock_in_at' => '2026-11-21 17:00:00',
            'clock_out_at' => '2026-11-21 08:00:00',
            'status' => 'unknown_status',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['clock_out_at', 'status']);

        // 3. Create valid attendance record (equal clock_in_at and clock_out_at is allowed)
        $created = $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'attendance_date' => '2026-11-21',
            'clock_in_at' => '2026-11-21 08:00:00',
            'clock_out_at' => '2026-11-21 08:00:00',
        ])->assertCreated();

        $firstId = $created->json('data.id');

        // PATCH changing clock_out_at before existing clock_in_at fails with 422
        $this->patchJson("/api/v1/modules/hr/employee-attendances/{$firstId}", [
            'clock_out_at' => '2026-11-21 07:30:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['clock_out_at']);

        // PATCH changing company_id without updating employee_id/shift_id fails with 422
        $this->patchJson("/api/v1/modules/hr/employee-attendances/{$firstId}", [
            'company_id' => $companyB->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_id', 'employee_shift_id']);

        // 4. Active duplicate (company_id, employee_id, attendance_date) rejected with 422
        $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'attendance_date' => '2026-11-21',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['attendance_date']);

        // DB-level unique constraint also rejects active duplicates directly
        expect(fn () => EmployeeAttendance::factory()->create([
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $shiftA->id,
            'attendance_date' => '2026-11-21',
        ]))->toThrow(QueryException::class);

        // 5. Soft delete, then re-create for the same (company_id, employee_id, attendance_date)
        $this->deleteJson("/api/v1/modules/hr/employee-attendances/{$firstId}")
            ->assertOk();

        $this->assertSoftDeleted('employee_attendances', ['id' => $firstId]);

        $recreated = $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => null,
            'attendance_date' => '2026-11-21',
            'status' => AttendanceStatusEnum::SICK->value,
            'notes' => 'Sakit demam',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'sick')
            ->assertJsonPath('data.employee_shift_id', null)
            ->assertJsonPath('data.late_minutes', 0)
            ->assertJsonPath('data.overtime_minutes', 0);

        expect($recreated->json('data.id'))->not->toBe($firstId);
    });

    it('records attendance via employee_attendance_code and supports first-scan clock-in and second-scan clock-out on the same attendance_date', function () {
        $companyA = Company::factory()->create(['name' => 'PT. Foodlab Scan A']);
        $companyB = Company::factory()->create(['name' => 'PT. Foodlab Scan B']);

        $position = EmployeePosition::factory()->create([
            'company_id' => $companyA->id,
            'name' => 'Analis QC',
        ]);
        $employeeA = Employee::factory()->create([
            'company_id' => $companyA->id,
            'employee_position_id' => $position->id,
            'name' => 'Nadia Putri',
        ]);
        $employeeB = Employee::factory()->create([
            'company_id' => $companyB->id,
            'name' => 'Citra Lestari',
        ]);

        $morningShift = EmployeeShift::factory()->create([
            'company_id' => $companyA->id,
            'code' => 'SHIFT-PAGI',
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'grace_period_minutes' => 15,
            'is_overnight' => false,
        ]);

        EmployeeShiftAssignment::factory()->create([
            'company_id' => $companyA->id,
            'employee_id' => $employeeA->id,
            'employee_shift_id' => $morningShift->id,
            'effective_date' => '2026-11-01',
            'end_date' => null,
        ]);

        // 1. Standard POST /employee-attendances resolves employee_id & company_id from employee_attendance_code
        $directRes = $this->postJson('/api/v1/modules/hr/employee-attendances', [
            'employee_attendance_code' => $employeeA->employee_attendance_code,
            'employee_shift_id' => $morningShift->id,
            'attendance_date' => '2026-11-20',
            'clock_in_at' => '2026-11-20 08:05:00',
            'notes' => 'Input kode barcode',
        ]);

        $directRes->assertCreated()
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.employee_id', $employeeA->id)
            ->assertJsonPath('data.late_minutes', 0)
            ->assertJsonPath('data.status', 'present');

        // Filter by employee_attendance_code works
        $this->getJson('/api/v1/modules/hr/employee-attendances?filter[employee_attendance_code]='.urlencode($employeeA->employee_attendance_code))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.employee.employee_attendance_code', $employeeA->employee_attendance_code);

        // 2. Barcode scan flow: 1st scan clocks in (late 10 mins past 08:15 grace -> 08:25)
        $firstScan = $this->postJson('/api/v1/modules/hr/employee-attendances/scan', [
            'employee_attendance_code' => $employeeA->employee_attendance_code,
            'scanned_at' => '2026-11-21 08:25:00',
            'notes' => 'Scan masuk gerbang',
        ]);

        $firstScan->assertCreated()
            ->assertJsonPath('meta.action', 'clock_in')
            ->assertJsonPath('data.company_id', $companyA->id)
            ->assertJsonPath('data.employee_id', $employeeA->id)
            ->assertJsonPath('data.employee_shift_id', $morningShift->id)
            ->assertJsonPath('data.attendance_date', '2026-11-21')
            ->assertJsonPath('data.late_minutes', 10)
            ->assertJsonPath('data.overtime_minutes', 0)
            ->assertJsonPath('data.status', 'late')
            ->assertJsonPath('data.clock_out_at', null);

        $scanAttendanceId = $firstScan->json('data.id');
        expect(Cache::has(EmployeeAttendanceService::CACHE_KEY_LIST))->toBeFalse();

        // Populate cache to verify second scan invalidates it
        $this->getJson('/api/v1/modules/hr/employee-attendances')->assertOk();
        expect(Cache::has(EmployeeAttendanceService::CACHE_KEY_LIST))->toBeTrue();

        // Scan earlier than clock-in fails with 422
        $this->postJson('/api/v1/modules/hr/employee-attendances/scan', [
            'employee_attendance_code' => $employeeA->employee_attendance_code,
            'scanned_at' => '2026-11-21 07:30:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['scanned_at']);

        // 3. Barcode scan flow: 2nd scan on the same attendance_date clocks out and computes overtime
        $secondScan = $this->postJson('/api/v1/modules/hr/employee-attendances/scan', [
            'employee_attendance_code' => $employeeA->employee_attendance_code,
            'scanned_at' => '2026-11-21 17:40:00',
        ]);

        $secondScan->assertOk()
            ->assertJsonPath('meta.action', 'clock_out')
            ->assertJsonPath('data.id', $scanAttendanceId)
            ->assertJsonPath('data.attendance_date', '2026-11-21')
            ->assertJsonPath('data.late_minutes', 10)
            ->assertJsonPath('data.overtime_minutes', 40)
            ->assertJsonPath('data.status', 'late');

        expect($secondScan->json('data.clock_in_at'))->not->toBeNull()
            ->and($secondScan->json('data.clock_out_at'))->not->toBeNull()
            ->and(Cache::has(EmployeeAttendanceService::CACHE_KEY_LIST))->toBeFalse();

        // 4. 3rd scan on the same attendance_date returns 422
        $this->postJson('/api/v1/modules/hr/employee-attendances/scan', [
            'employee_attendance_code' => $employeeA->employee_attendance_code,
            'scanned_at' => '2026-11-21 18:00:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['attendance_date']);

        // 5. Cross-company mismatch and unknown barcode fail with 422
        $this->postJson('/api/v1/modules/hr/employee-attendances/scan', [
            'company_id' => $companyA->id,
            'employee_attendance_code' => $employeeB->employee_attendance_code,
            'scanned_at' => '2026-11-21 08:00:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_attendance_code']);

        $this->postJson('/api/v1/modules/hr/employee-attendances/scan', [
            'employee_attendance_code' => 'UNKNOWN999',
            'scanned_at' => '2026-11-21 08:00:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['employee_attendance_code']);

        // 6. Direct RecordAttendanceAction::scan() call (on-time first scan -> present)
        $action = app(RecordAttendanceAction::class);
        $directClockIn = $action->scan([
            'employee_attendance_code' => $employeeB->employee_attendance_code,
            'scanned_at' => '2026-11-22 08:00:00',
        ]);
        expect($directClockIn->employee_id)->toBe($employeeB->id)
            ->and($directClockIn->status)->toBe(AttendanceStatusEnum::PRESENT)
            ->and($directClockIn->clock_out_at)->toBeNull();

        $directClockOut = $action->scan([
            'employee_attendance_code' => $employeeB->employee_attendance_code,
            'scanned_at' => '2026-11-22 17:00:00',
        ]);
        expect($directClockOut->id)->toBe($directClockIn->id)
            ->and($directClockOut->clock_out_at)->not->toBeNull();
    });
});
