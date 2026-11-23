<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeShift;
use App\Models\EmployeeShiftAssignment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmployeeShiftAssignment>
 */
class EmployeeShiftAssignmentFactory extends Factory
{
    protected $model = EmployeeShiftAssignment::class;

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
            'effective_date' => $this->faker->unique()->date('Y-m-d'),
            'end_date' => null,
            'notes' => null,
        ];
    }
}
