<?php

use App\Enums\AttendanceStatusEnum;
use App\Enums\PayrollGroup;
use App\Enums\PayrollItemStatus;
use App\Enums\PayrollRunStatus;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeePosition;
use App\Models\PayrollGrade;
use App\Models\PayrollRun;
use App\Models\TaxStatus;
use App\Modules\CHO\Services\PayrollService;
use App\Support\ActiveCompany;
use Illuminate\Support\Facades\Cache;

describe('PayrollService & Input Payroll CHO workflow', function () {
    beforeEach(function () {
        Cache::flush();
        ActiveCompany::clear();
        actingAsErpUser();
    });

    it('exposes cutoff and effective work days constants and resolves cutoff windows', function () {
        expect(PayrollService::CUTOFF_DAY)->toBe(21);
        expect(PayrollService::PERIOD_START_DAY)->toBe(22);
        expect(PayrollService::EFFECTIVE_WORK_DAYS)->toBe(25);

        $service = app(PayrollService::class);
        $janWindow = $service->resolvePeriodWindow('2026-01');

        expect($janWindow)->toBe([
            'period' => '2026-01',
            'period_date' => '2026-01-01',
            'cutoff_start_date' => '2025-12-22',
            'cutoff_end_date' => '2026-01-21',
        ]);
    });

    it('calculates PPh 21 accurately using Pasal 17 annualized brackets and PTKP', function () {
        $service = app(PayrollService::class);

        $tk0 = TaxStatus::factory()->create([
            'code' => 'TK/0',
            'name' => 'Tidak Kawin / 0 Tanggungan',
        ]);
        $k0 = TaxStatus::factory()->create([
            'code' => 'K/0',
            'name' => 'Kawin / 0 Tanggungan',
        ]);

        // Below PTKP -> 0
        expect($service->calculatePph21(2416600, 24166, 48332, 2458898, 0, 402600, 0, $tk0))
            ->toBe(0.0);

        // TK/0: (2,416,600 + 3,454,898 - 24,166 - 48,332 - 402,600) = 5,396,400 -> 31,325
        expect($service->calculatePph21(2416600, 24166, 48332, 3454898, 0, 402600, 0, $tk0))
            ->toBe(31325.0);

        // K/0: (2,416,600 + 3,039,800) = 5,456,400 -> 15,425
        expect($service->calculatePph21(2416600, 0, 0, 3039800, 0, 0, 0, $k0))
            ->toBe(15425.0);

        // TK/0: (2,416,600 + 3,926,360) = 6,342,960 -> 76,288
        expect($service->calculatePph21(2416600, 0, 0, 3926360, 0, 0, 0, $tk0))
            ->toBe(76288.0);
    });

    it('builds workspace from EmployeeAttendance cutoff window with effective 25 days, saves draft, finalizes row, and locks finalized row', function () {
        $company = Company::factory()->create(['name' => 'CV Area 31']);
        $otherCompany = Company::factory()->create(['name' => 'PT. Other']);

        $posSpv = EmployeePosition::factory()->create(['name' => 'SPV']);
        $posOutlet = EmployeePosition::factory()->create(['name' => 'Outlet']);

        $gradeOffice = PayrollGrade::factory()->create([
            'grade' => 2,
            'sub_grade' => 'A',
            'base_salary' => 2416600,
            'position_allowance' => 0,
            'total_gross' => 2416600,
            'bpjs_kesehatan_employee' => 24166,
            'bpjs_ketenagakerjaan_employee' => 48332,
        ]);
        $gradeOutlet = PayrollGrade::factory()->create([
            'grade' => 1,
            'sub_grade' => 'A',
            'base_salary' => 1750000, // 70,000 per day for 25 effective days
            'position_allowance' => 0,
            'total_gross' => 1750000,
            'bpjs_kesehatan_employee' => 17500,
            'bpjs_ketenagakerjaan_employee' => 35000,
        ]);

        $tk0 = TaxStatus::factory()->create([
            'code' => 'TK/0',
            'name' => 'Tidak Kawin 0',
        ]);

        $officeEmp = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_position_id' => $posSpv->id,
            'payroll_grade_id' => $gradeOffice->id,
            'tax_status_id' => $tk0->id,
            'name' => 'Andre Febrian',
            'bpjs_kesehatan' => '000111222',
            'bpjs_ketenagakerjaan' => '1900111222',
        ]);

        $outletEmp = Employee::factory()->create([
            'company_id' => $company->id,
            'employee_position_id' => $posOutlet->id,
            'payroll_grade_id' => $gradeOutlet->id,
            'tax_status_id' => $tk0->id,
            'name' => 'Siti Outlet',
            'bpjs_kesehatan' => null,
            'bpjs_ketenagakerjaan' => null,
        ]);

        // Employee in another company must not appear
        Employee::factory()->create([
            'company_id' => $otherCompany->id,
            'name' => 'Orang Luar',
        ]);

        // Office employee: 25 attended days within 2025-12-22..2026-01-21
        $startDate = \Carbon\CarbonImmutable::parse('2025-12-22');
        for ($i = 0; $i < 25; $i++) {
            EmployeeAttendance::factory()->create([
                'company_id' => $company->id,
                'employee_id' => $officeEmp->id,
                'attendance_date' => $startDate->addDays($i)->format('Y-m-d'),
                'status' => $i === 24 ? AttendanceStatusEnum::LATE : AttendanceStatusEnum::PRESENT,
            ]);
        }
        // Non-worked & out-of-window attendance records should NOT be counted
        EmployeeAttendance::factory()->create([
            'company_id' => $company->id,
            'employee_id' => $officeEmp->id,
            'attendance_date' => '2026-01-20',
            'status' => AttendanceStatusEnum::ABSENT,
        ]);
        EmployeeAttendance::factory()->create([
            'company_id' => $company->id,
            'employee_id' => $officeEmp->id,
            'attendance_date' => '2025-12-21', // before cutoff start 2025-12-22
            'status' => AttendanceStatusEnum::PRESENT,
        ]);
        EmployeeAttendance::factory()->create([
            'company_id' => $company->id,
            'employee_id' => $officeEmp->id,
            'attendance_date' => '2026-01-22', // after cutoff end 2026-01-21
            'status' => AttendanceStatusEnum::PRESENT,
        ]);

        // Outlet employee: 18 attended days within cutoff -> 18/25 * 1,750,000 = 1,260,000
        for ($i = 0; $i < 18; $i++) {
            EmployeeAttendance::factory()->create([
                'company_id' => $company->id,
                'employee_id' => $outletEmp->id,
                'attendance_date' => $startDate->addDays($i)->format('Y-m-d'),
                'status' => AttendanceStatusEnum::PRESENT,
            ]);
        }

        // 1. Workspace GET
        $workspaceRes = $this->getJson("/api/v1/modules/cho/payroll/workspace?company_id={$company->id}&period=2026-01");
        $workspaceRes->assertOk()
            ->assertJsonPath('data.period', '2026-01')
            ->assertJsonPath('data.period_date', '2026-01-01')
            ->assertJsonPath('data.cutoff_start_date', '2025-12-22')
            ->assertJsonPath('data.cutoff_end_date', '2026-01-21')
            ->assertJsonPath('data.cutoff_day', 21)
            ->assertJsonPath('data.effective_work_days', 25)
            ->assertJsonPath('data.payroll_run', null)
            ->assertJsonCount(2, 'data.rows');

        $rows = collect($workspaceRes->json('data.rows'))->keyBy('employee_id');
        expect($rows[$officeEmp->id]['attendance_days'])->toBe(25);
        expect((float) $rows[$officeEmp->id]['base_salary'])->toBe(2416600.0);
        expect((float) $rows[$officeEmp->id]['bpjs_kesehatan'])->toBe(24166.0);
        expect((float) $rows[$officeEmp->id]['bpjs_ketenagakerjaan'])->toBe(48332.0);
        expect($rows[$officeEmp->id]['payroll_group'])->toBe(PayrollGroup::OFFICE->value);
        expect($rows[$officeEmp->id]['status'])->toBe(PayrollItemStatus::DRAFT->value);
        expect($rows[$officeEmp->id]['employee']['employment_status']['name'] ?? null)->not->toBeNull();
        expect($rows[$officeEmp->id]['employee']['payroll_grade']['id'] ?? null)->toBe($gradeOffice->id);

        expect($rows[$outletEmp->id]['attendance_days'])->toBe(18);
        expect((float) $rows[$outletEmp->id]['base_salary'])->toBe(1260000.0);
        expect((float) $rows[$outletEmp->id]['bpjs_kesehatan'])->toBe(0.0);
        expect((float) $rows[$outletEmp->id]['bpjs_ketenagakerjaan'])->toBe(0.0);
        expect($rows[$outletEmp->id]['payroll_group'])->toBe(PayrollGroup::OUTLET->value);

        // 2. Save draft row for office employee (Bonus 3,454,898, Potongan 402,600 -> PPh21 31,325)
        $saveRes = $this->postJson('/api/v1/modules/cho/payroll/save-row', [
            'company_id' => $company->id,
            'employee_id' => $officeEmp->id,
            'period' => '2026-01',
            'bonus' => 3454898,
            'overtime' => 0,
            'deduction' => 402600,
            'thr' => 0,
        ]);

        $saveRes->assertSuccessful()
            ->assertJsonPath('data.status', PayrollItemStatus::DRAFT->value)
            ->assertJsonPath('data.attendance_days', 25);

        expect((float) $saveRes->json('data.pph21'))->toBe(31325.0);
        // Total Net = (2416600 + 3454898) - (24166 + 48332 + 402600 + 31325) = 5365075
        expect((float) $saveRes->json('data.total_net'))->toBe(5365075.0);

        $payrollRun = PayrollRun::query()
            ->where('company_id', $company->id)
            ->whereDate('period_date', '2026-01-01')
            ->first();
        expect($payrollRun)->not->toBeNull();
        expect($payrollRun->status)->toBe(PayrollRunStatus::DRAFT);
        expect((float) $payrollRun->total_pph21)->toBe(31325.0);
        expect((float) $payrollRun->total_net)->toBe(5365075.0);

        // 3. Finalize row (with Idempotency-Key)
        $finalizePayload = [
            'company_id' => $company->id,
            'employee_id' => $officeEmp->id,
            'period' => '2026-01',
            'bonus' => 3454898,
            'overtime' => 100000,
            'deduction' => 402600,
            'thr' => 0,
        ];
        $finalizeRes = $this->postJson(
            '/api/v1/modules/cho/payroll/finalize-row',
            $finalizePayload,
            ['Idempotency-Key' => 'finalize-office-2026-01']
        );

        $finalizeRes->assertOk()
            ->assertJsonPath('data.status', PayrollItemStatus::FINALIZED->value)
            ->assertJsonPath('data.finalized_by', auth()->id())
            ->assertJsonPath('data.employee.payroll_grade.id', $gradeOffice->id);
        expect($finalizeRes->json('data.employee.employment_status.name'))->not->toBeNull();
        expect($finalizeRes->json('data.finalized_at'))->not->toBeNull();

        $replayFinalize = $this->postJson(
            '/api/v1/modules/cho/payroll/finalize-row',
            $finalizePayload,
            ['Idempotency-Key' => 'finalize-office-2026-01']
        );
        $replayFinalize->assertOk();
        expect($replayFinalize->headers->get('X-Idempotency-Replayed'))->toBe('true');

        $finalizedItemId = $finalizeRes->json('data.id');

        // 4. Attempting to modify or re-finalize the finalized row returns 422
        $this->postJson('/api/v1/modules/cho/payroll/save-row', [
            'company_id' => $company->id,
            'employee_id' => $officeEmp->id,
            'period' => '2026-01',
            'bonus' => 9999999,
        ])->assertUnprocessable()->assertJsonValidationErrors(['employee_id']);

        $this->postJson('/api/v1/modules/cho/payroll/finalize-row', [
            'company_id' => $company->id,
            'employee_id' => $officeEmp->id,
            'period' => '2026-01',
            'bonus' => 9999999,
        ])->assertUnprocessable()->assertJsonValidationErrors(['employee_id']);

        $this->patchJson("/api/v1/modules/cho/payroll-items/{$finalizedItemId}", [
            'bonus' => 1000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['payroll_item']);

        $this->deleteJson("/api/v1/modules/cho/payroll-items/{$finalizedItemId}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payroll_item']);

        // 5. Meanwhile, outlet employee in the SAME period can still be finalized independently
        $this->postJson('/api/v1/modules/cho/payroll/finalize-row', [
            'company_id' => $company->id,
            'employee_id' => $outletEmp->id,
            'period' => '2026-01',
            'bonus' => 0,
            'overtime' => 0,
            'deduction' => 0,
            'thr' => 0,
        ])->assertSuccessful()
            ->assertJsonPath('data.status', PayrollItemStatus::FINALIZED->value);
    });
});
