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

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'company_id' => Company::factory(),
            'code' => strtoupper($this->faker->unique()->bothify('TAX-###??')).'-'.$seq,
            'name' => $this->faker->words(2, true).' #'.$seq,
            'description' => $this->faker->sentence(),
        ];
    }
}
