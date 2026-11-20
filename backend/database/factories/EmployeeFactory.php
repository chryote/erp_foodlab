<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\EmploymentStatus;
use App\Models\PayrollGrade;
use App\Models\TaxStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'employee_position_id' => EmployeePosition::factory(),
            'employment_status_id' => EmploymentStatus::factory(),
            'payroll_grade_id' => PayrollGrade::factory(),
            'tax_status_id' => TaxStatus::factory(),
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->numerify('08##########'),
        ];
    }
}
