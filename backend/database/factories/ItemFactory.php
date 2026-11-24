<?php

namespace Database\Factories;

use App\Enums\ItemType;
use App\Models\Company;
use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    protected $model = Item::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;

        return [
            'company_id' => Company::factory(),
            'name' => ucfirst($this->faker->unique()->words(2, true)).' #'.$seq,
            'type' => ItemType::Bahan,
        ];
    }
}
