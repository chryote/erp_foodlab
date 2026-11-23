<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\EmployeePosition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmployeePosition>
 */
class EmployeePositionFactory extends Factory
{
    protected $model = EmployeePosition::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'company_id' => Company::factory(),
            'code' => strtoupper($this->faker->unique()->bothify('POS-###??')).'-'.$seq,
            'name' => $this->faker->jobTitle().' #'.$seq,
            'description' => $this->faker->sentence(),
        ];
    }
}
