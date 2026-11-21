<?php

namespace App\Modules\HR\Actions;

use App\Enums\AttendanceStatusEnum;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeeShift;
use App\Models\EmployeeShiftAssignment;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Records or updates an attendance entry inside a transaction while computing
 * late_minutes (respecting shift grace_period_minutes) and overtime_minutes.
 */
class RecordAttendanceAction
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?EmployeeAttendance $employeeAttendance = null): EmployeeAttendance
    {
        return DB::transaction(function () use ($attributes, $employeeAttendance): EmployeeAttendance {
            $locked = $employeeAttendance !== null
                ? EmployeeAttendance::query()->lockForUpdate()->findOrFail($employeeAttendance->getKey())
                : null;

            if ($locked === null && ! isset($attributes['employee_id']) && ! empty($attributes['employee_attendance_code'])) {
                $employee = $this->resolveEmployee(
                    null,
                    (string) $attributes['employee_attendance_code'],
                    isset($attributes['company_id']) ? (int) $attributes['company_id'] : null,
                );

                $attributes['employee_id'] = $employee->id;
                $attributes['company_id'] ??= $employee->company_id;
            }

            unset($attributes['employee_attendance_code']);

            $payload = $this->withComputedMetrics($attributes, $locked);

            if ($locked !== null) {
                $locked->update($payload);

                return $locked;
            }

            return EmployeeAttendance::query()->create($payload);
        });
    }

    /**
     * Barcode scan workflow for a single attendance_date:
     * - First scan records clock_in_at (and auto-resolves active shift assignment if omitted).
     * - Second scan on the same date records clock_out_at and computes overtime_minutes.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function scan(array $attributes): EmployeeAttendance
    {
        return DB::transaction(function () use ($attributes): EmployeeAttendance {
            $employee = $this->resolveEmployee(
                isset($attributes['employee_id']) ? (int) $attributes['employee_id'] : null,
                isset($attributes['employee_attendance_code']) ? (string) $attributes['employee_attendance_code'] : null,
                isset($attributes['company_id']) ? (int) $attributes['company_id'] : null,
            );

            $timezone = config('app.timezone', 'UTC');
            $scannedAt = isset($attributes['scanned_at'])
                ? CarbonImmutable::parse((string) $attributes['scanned_at'], $timezone)->setTimezone($timezone)
                : CarbonImmutable::now($timezone);

            $attendanceDate = isset($attributes['attendance_date'])
                ? CarbonImmutable::parse((string) $attributes['attendance_date'], $timezone)->format('Y-m-d')
                : $scannedAt->format('Y-m-d');

            $existing = EmployeeAttendance::query()
                ->where('company_id', $employee->company_id)
                ->where('employee_id', $employee->id)
                ->whereDate('attendance_date', $attendanceDate)
                ->lockForUpdate()
                ->first();

            // First scan: record clock-in
            if ($existing === null || $existing->clock_in_at === null) {
                $shiftId = array_key_exists('employee_shift_id', $attributes)
                    ? ($attributes['employee_shift_id'] !== null ? (int) $attributes['employee_shift_id'] : null)
                    : ($existing?->employee_shift_id ?? $this->resolveActiveShiftId(
                        $employee->company_id,
                        $employee->id,
                        $attendanceDate,
                    ));

                $clockInPayload = [
                    'company_id' => $employee->company_id,
                    'employee_id' => $employee->id,
                    'employee_shift_id' => $shiftId,
                    'attendance_date' => $attendanceDate,
                    'clock_in_at' => $scannedAt,
                ];

                if (array_key_exists('notes', $attributes)) {
                    $clockInPayload['notes'] = $attributes['notes'];
                }

                $computed = $this->withComputedMetrics($clockInPayload, $existing);
                $computed['status'] = $attributes['status']
                    ?? (($computed['late_minutes'] ?? 0) > 0
                        ? AttendanceStatusEnum::LATE->value
                        : AttendanceStatusEnum::PRESENT->value);

                if ($existing !== null) {
                    $existing->update($computed);

                    return $existing;
                }

                return EmployeeAttendance::query()->create($computed);
            }

            // Third+ scan: both clock-in and clock-out already recorded
            if ($existing->clock_out_at !== null) {
                throw ValidationException::withMessages([
                    'attendance_date' => [
                        'Attendance for this employee on the specified date already has both clock-in and clock-out recorded.',
                    ],
                ]);
            }

            $clockIn = CarbonImmutable::parse($existing->clock_in_at)->setTimezone($timezone);

            if ($scannedAt->lessThan($clockIn)) {
                throw ValidationException::withMessages([
                    'scanned_at' => [
                        'Clock-out time must be greater than or equal to clock-in time.',
                    ],
                ]);
            }

            // Second scan: record clock-out on existing attendance entry
            $clockOutPayload = [
                'clock_out_at' => $scannedAt,
            ];

            if (array_key_exists('notes', $attributes) && $attributes['notes'] !== null) {
                $clockOutPayload['notes'] = $attributes['notes'];
            }

            $computed = $this->withComputedMetrics($clockOutPayload, $existing);
            $existing->update($computed);

            return $existing;
        });
    }

    private function resolveEmployee(?int $employeeId, ?string $attendanceCode, ?int $companyId): Employee
    {
        if ($employeeId !== null) {
            $employee = Employee::query()
                ->whereKey($employeeId)
                ->when($companyId !== null, fn ($q) => $q->where('company_id', $companyId))
                ->first();

            if ($employee === null) {
                throw ValidationException::withMessages([
                    'employee_id' => ['The selected employee is invalid or does not belong to the specified company.'],
                ]);
            }

            return $employee;
        }

        $trimmedCode = $attendanceCode !== null ? trim($attendanceCode) : '';

        if ($trimmedCode !== '') {
            $employee = Employee::query()
                ->where('employee_attendance_code', $trimmedCode)
                ->when($companyId !== null, fn ($q) => $q->where('company_id', $companyId))
                ->first();

            if ($employee === null) {
                throw ValidationException::withMessages([
                    'employee_attendance_code' => [
                        'The employee attendance code is invalid or does not belong to the specified company.',
                    ],
                ]);
            }

            return $employee;
        }

        throw ValidationException::withMessages([
            'employee_attendance_code' => ['Employee attendance code or employee ID is required.'],
        ]);
    }

    private function resolveActiveShiftId(int $companyId, int $employeeId, string $attendanceDate): ?int
    {
        $shiftId = EmployeeShiftAssignment::query()
            ->where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->whereDate('effective_date', '<=', $attendanceDate)
            ->where(function ($query) use ($attendanceDate): void {
                $query->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $attendanceDate);
            })
            ->orderByDesc('effective_date')
            ->orderByDesc('id')
            ->value('employee_shift_id');

        return $shiftId !== null ? (int) $shiftId : null;
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function withComputedMetrics(array $attributes, ?EmployeeAttendance $existing): array
    {
        $shiftId = array_key_exists('employee_shift_id', $attributes)
            ? $attributes['employee_shift_id']
            : $existing?->employee_shift_id;

        $attendanceDateRaw = array_key_exists('attendance_date', $attributes)
            ? $attributes['attendance_date']
            : $existing?->attendance_date;

        $clockInRaw = array_key_exists('clock_in_at', $attributes)
            ? $attributes['clock_in_at']
            : $existing?->clock_in_at;

        $clockOutRaw = array_key_exists('clock_out_at', $attributes)
            ? $attributes['clock_out_at']
            : $existing?->clock_out_at;

        if ($shiftId === null || $attendanceDateRaw === null) {
            if ($existing === null) {
                $attributes['late_minutes'] = (int) ($attributes['late_minutes'] ?? 0);
                $attributes['overtime_minutes'] = (int) ($attributes['overtime_minutes'] ?? 0);
            } else {
                if (array_key_exists('late_minutes', $attributes)) {
                    $attributes['late_minutes'] = (int) ($attributes['late_minutes'] ?? 0);
                }
                if (array_key_exists('overtime_minutes', $attributes)) {
                    $attributes['overtime_minutes'] = (int) ($attributes['overtime_minutes'] ?? 0);
                }
            }

            return $attributes;
        }

        $shift = EmployeeShift::query()->find($shiftId);

        if ($shift === null) {
            $attributes['late_minutes'] = (int) ($attributes['late_minutes'] ?? 0);
            $attributes['overtime_minutes'] = (int) ($attributes['overtime_minutes'] ?? 0);

            return $attributes;
        }

        $timezone = config('app.timezone', 'UTC');
        $dateString = CarbonImmutable::parse($attendanceDateRaw, $timezone)->format('Y-m-d');

        $shiftStart = CarbonImmutable::parse("{$dateString} {$shift->start_time}", $timezone);
        $shiftEnd = CarbonImmutable::parse("{$dateString} {$shift->end_time}", $timezone);

        if ($shift->is_overnight || $shiftEnd->lessThanOrEqualTo($shiftStart)) {
            $shiftEnd = $shiftEnd->addDay();
        }

        $lateMinutes = 0;
        if ($clockInRaw !== null) {
            $clockIn = CarbonImmutable::parse($clockInRaw)->setTimezone($timezone);
            $graceDeadline = $shiftStart->addMinutes(max(0, (int) $shift->grace_period_minutes));

            if ($clockIn->greaterThan($graceDeadline)) {
                $lateMinutes = min(65535, (int) floor($graceDeadline->diffInMinutes($clockIn)));
            }
        }

        $overtimeMinutes = 0;
        if ($clockOutRaw !== null) {
            $clockOut = CarbonImmutable::parse($clockOutRaw)->setTimezone($timezone);

            if ($clockOut->greaterThan($shiftEnd)) {
                $overtimeMinutes = min(65535, (int) floor($shiftEnd->diffInMinutes($clockOut)));
            }
        }

        $attributes['late_minutes'] = $lateMinutes;
        $attributes['overtime_minutes'] = $overtimeMinutes;

        return $attributes;
    }
}
