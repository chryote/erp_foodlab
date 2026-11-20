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

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'code' => strtoupper($this->faker->unique()->bothify('POS-###??')),
            'name' => $this->faker->jobTitle(),
            'description' => $this->faker->sentence(),
        ];
    }
}
