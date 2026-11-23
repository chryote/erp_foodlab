<?php

namespace Database\Factories;

use App\Models\EmploymentStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmploymentStatus>
 */
class EmploymentStatusFactory extends Factory
{
    protected $model = EmploymentStatus::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'code' => strtoupper($this->faker->unique()->bothify('STS-###??')).'-'.$seq,
            'name' => $this->faker->words(2, true).' #'.$seq,
            'description' => $this->faker->sentence(),
        ];
    }
}
