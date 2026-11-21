<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\ExpenseType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExpenseType>
 */
class ExpenseTypeFactory extends Factory
{
    protected $model = ExpenseType::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        return [
            'expense_category_id' => ExpenseCategory::factory(),
            'company_id' => Company::factory(),
            'name' => $this->faker->words(2, true).' #'.self::$sequence++,
        ];
    }
}
