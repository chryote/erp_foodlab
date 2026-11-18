<?php

namespace Database\Factories;

use App\Models\LabSample;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LabSample>
 */
class LabSampleFactory extends Factory
{
    protected $model = LabSample::class;

    public function definition(): array
    {
        return [
            'batch_code' => 'FL-' . strtoupper(fake()->unique()->bothify('????-####')),
            'product_name' => fake()->randomElement([
                'Organic Almond Milk',
                'Fermented Kimchi Batch A',
                'Cold-Pressed Olive Oil',
                'Greek Yogurt Plain',
                'Artisanal Sourdough Crumb',
            ]),
            'category' => fake()->randomElement(['Dairy', 'Beverage', 'Fermented', 'Bakery', 'Oils']),
            'ph_level' => fake()->randomFloat(2, 3.8, 7.0),
            'moisture_percent' => fake()->randomFloat(2, 12.0, 88.0),
            'status' => fake()->randomElement(['pending', 'approved', 'rejected']),
        ];
    }
}
