<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\PacketCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PacketCategory>
 */
class PacketCategoryFactory extends Factory
{
    protected $model = PacketCategory::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'company_owner_id' => Company::factory(),
            'name' => 'Kategori '.ucfirst($this->faker->unique()->words(2, true)).' #'.$seq,
        ];
    }
}
