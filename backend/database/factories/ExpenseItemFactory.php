<?php

namespace Database\Factories;

use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CapitalCompany>
 */
class ExpenseItemFactory extends Factory
{
    protected $model = ExpenseItem::class;

    public function definition(): array
    {
        return [
            'expense_category_id' => ExpenseCategory::factory(),
            'expense_type_id' => ExpenseType::factory(),
            'name' => $this->faker->name(),
            'amount' => $this->faker->randomFloat(2, 1000000, 1000000000),
        ];
    }
}
