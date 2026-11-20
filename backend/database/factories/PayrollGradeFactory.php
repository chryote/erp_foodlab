<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\PayrollGrade;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PayrollGrade>
 */
class PayrollGradeFactory extends Factory
{
    protected $model = PayrollGrade::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'grade' => $this->faker->numberBetween(1, 20),
            'sub_grade' => strtoupper($this->faker->unique()->bothify('?##')),
            'level_label' => $this->faker->randomElement([
                'staff, spv',
                'staff khusus, spv khusus',
                'manager',
            ]),
            'base_salary' => $this->faker->numberBetween(30, 150) * 100000,
            'position_allowance' => $this->faker->numberBetween(0, 30) * 100000,
            'total_gross' => fn (array $attributes): float => $this->gross($attributes),
            'bpjs_kesehatan_company' => fn (array $attributes): float => (float) round($this->gross($attributes) * 0.04),
            'bpjs_kesehatan_employee' => fn (array $attributes): float => (float) round($this->gross($attributes) * 0.01),
            'bpjs_ketenagakerjaan_company' => fn (array $attributes): float => (float) round($this->gross($attributes) * 0.0394),
            'bpjs_ketenagakerjaan_employee' => fn (array $attributes): float => (float) round($this->gross($attributes) * 0.02),
            'net_employee_received' => function (array $attributes): float {
                $gross = $this->gross($attributes);

                return $gross - (float) round($gross * 0.01) - (float) round($gross * 0.02);
            },
            'total_company_cost' => function (array $attributes): float {
                $gross = $this->gross($attributes);

                return $gross + (float) round($gross * 0.04) + (float) round($gross * 0.0394);
            },
        ];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function gross(array $attributes): float
    {
        return (float) $attributes['base_salary'] + (float) ($attributes['position_allowance'] ?? 0);
    }
}
