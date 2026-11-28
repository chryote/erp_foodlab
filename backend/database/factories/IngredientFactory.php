<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ingredient>
 */
class IngredientFactory extends Factory
{
    protected $model = Ingredient::class;

    public function definition(): array
    {
        return [
            'company_owner_id' => Company::factory(),
            'default_package_id' => DefaultPackage::factory(),
            'item_id' => Item::factory(),
            'price' => round($this->faker->randomFloat(2, 1000, 100000), 2),
        ];
    }
}
