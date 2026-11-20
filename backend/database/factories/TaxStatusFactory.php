<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\TaxStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaxStatus>
 */
class TaxStatusFactory extends Factory
{
    protected $model = TaxStatus::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'code' => strtoupper($this->faker->unique()->bothify('TAX-###??')),
            'name' => $this->faker->unique()->words(2, true),
            'description' => $this->faker->sentence(),
        ];
    }
}
