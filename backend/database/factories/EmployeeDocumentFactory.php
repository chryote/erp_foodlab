<?php

namespace Database\Factories;

use App\Enums\JenisDokumen;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmployeeDocument>
 */
class EmployeeDocumentFactory extends Factory
{
    protected $model = EmployeeDocument::class;

    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory(),
            'document_type' => $this->faker->randomElement(JenisDokumen::values()),
            'file_url' => $this->faker->url(),
        ];
    }
}
