<?php

namespace App\Modules\HR\Actions;

use App\Models\EmployeeAttendance;
use App\Models\EmployeeShift;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

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

            $payload = $this->withComputedMetrics($attributes, $locked);

            if ($locked !== null) {
                $locked->update($payload);

                return $locked;
            }

            return EmployeeAttendance::query()->create($payload);
        });
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
