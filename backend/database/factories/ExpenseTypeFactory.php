<?php

namespace Database\Factories;

use App\Models\CapitalCompany;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\ExpenseType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CapitalCompany>
 */
class ExpenseTypeFactory extends Factory
{
    protected $model = ExpenseType::class;

    public function definition(): array
    {
        return [
            'expense_category_id' => ExpenseCategory::factory(),
            'name' => $this->faker->name(),
        ];
    }
}
