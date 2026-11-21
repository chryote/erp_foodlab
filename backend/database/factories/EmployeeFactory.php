<?php

namespace Database\Factories;

use App\Enums\Agama;
use App\Enums\GolonganDarah;
use App\Enums\JenisKelamin;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeePosition;
use App\Models\EmploymentStatus;
use App\Models\PayrollGrade;
use App\Models\TaxStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'employee_position_id' => EmployeePosition::factory(),
            'employment_status_id' => EmploymentStatus::factory(),
            'payroll_grade_id' => PayrollGrade::factory(),
            'tax_status_id' => TaxStatus::factory(),
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->numerify('08##########'),
            'photo_url' => null,
            'nik_ktp' => $this->faker->unique()->numerify('################'),
            'nickname' => $this->faker->firstName(),
            'birth_place' => $this->faker->city(),
            'birth_date' => $this->faker->date('Y-m-d', '-20 years'),
            'gender' => $this->faker->randomElement(JenisKelamin::values()),
            'religion' => $this->faker->randomElement(Agama::values()),
            'blood_type' => $this->faker->randomElement(GolonganDarah::values()),
            'mother_name' => $this->faker->name('female'),
            'ktp_address' => $this->faker->address(),
            'domicile_address' => $this->faker->address(),
            'whatsapp_number' => $this->faker->numerify('08##########'),
            'emergency_phone_number' => $this->faker->numerify('08##########'),
            'instagram' => '@'.$this->faker->userName(),
            'tiktok' => '@'.$this->faker->userName(),
            'bpjs_ketenagakerjaan' => $this->faker->numerify('###########'),
            'bpjs_kesehatan' => $this->faker->numerify('#############'),
            'npwp_number' => $this->faker->numerify('################'),
        ];
    }
}
