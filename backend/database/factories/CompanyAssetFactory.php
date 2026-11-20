<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\CompanyAsset;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CompanyAsset>
 */
class CompanyAssetFactory extends Factory
{
    protected $model = CompanyAsset::class;

    public function definition(): array
    {
        $amount = $this->faker->numberBetween(1, 20);
        $pricePerUnit = $this->faker->randomFloat(2, 100000, 50000000);

        return [
            'company_id' => Company::factory(),
            'asset_date' => now()->toDateString(),
            'name' => $this->faker->words(2, true),
            'amount' => $amount,
            'price_per_unit' => $pricePerUnit,
            'total_price' => $amount * $pricePerUnit,
        ];
    }
}
