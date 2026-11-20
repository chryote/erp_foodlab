<?php

namespace Database\Factories;

use App\Models\CapitalCompany;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CapitalCompany>
 */
class CapitalCompanyFactory extends Factory
{
    protected $model = CapitalCompany::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'stakeholder_name' => $this->faker->name(),
            'capital' => $this->faker->randomFloat(2, 1000000, 1000000000),
        ];
    }
}
