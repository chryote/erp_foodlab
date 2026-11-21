<?php

namespace Database\Factories;

use App\Enums\AttendanceStatusEnum;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeeShift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmployeeAttendance>
 */
class EmployeeAttendanceFactory extends Factory
{
    protected $model = EmployeeAttendance::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'employee_id' => function (array $attributes): int {
                return Employee::factory()->create([
                    'company_id' => $attributes['company_id'],
                ])->id;
            },
            'employee_shift_id' => function (array $attributes): int {
                return EmployeeShift::factory()->create([
                    'company_id' => $attributes['company_id'],
                ])->id;
            },
            'attendance_date' => $this->faker->unique()->date('Y-m-d'),
            'clock_in_at' => null,
            'clock_out_at' => null,
            'late_minutes' => 0,
            'overtime_minutes' => 0,
            'status' => AttendanceStatusEnum::PRESENT,
            'notes' => null,
        ];
    }
}
