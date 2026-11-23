<?php

namespace Database\Factories;

use App\Enums\ShiftStatusEnum;
use App\Models\Company;
use App\Models\EmployeeShift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmployeeShift>
 */
class EmployeeShiftFactory extends Factory
{
    protected $model = EmployeeShift::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'code' => strtoupper($this->faker->unique()->bothify('SHF-###??')),
            'name' => 'Shift '.ucfirst($this->faker->unique()->word()),
            'start_time' => '08:00:00',
            'end_time' => '17:00:00',
            'break_minutes' => 60,
            'grace_period_minutes' => 15,
            'is_overnight' => false,
            'status' => ShiftStatusEnum::ACTIVE,
            'description' => $this->faker->sentence(),
        ];
    }
}
