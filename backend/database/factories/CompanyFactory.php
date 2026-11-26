<?php

namespace Database\Factories;

use App\Enums\CompanyType;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    protected $model = Company::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        return [
            'name' => $this->faker->company().' #'.self::$sequence++,
            'series' => 1,
            'type' => CompanyType::Utama,
        ];
    }
}
