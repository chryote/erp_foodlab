<?php

namespace Database\Factories;

use App\Enums\PayrollGroup;
use App\Models\Company;
use App\Models\Employee;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PayrollItem>
 */
class PayrollItemFactory extends Factory
{
    protected $model = PayrollItem::class;

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'payroll_run_id' => fn (array $attributes): mixed => PayrollRun::factory()->create([
                'company_id' => $attributes['company_id'],
            ])->id,
            'employee_id' => fn (array $attributes): mixed => Employee::factory()->create([
                'company_id' => $attributes['company_id'],
            ])->id,
            'employee_position_id' => null,
            'payroll_group' => PayrollGroup::OFFICE,
            'bank_account_number' => null,
            'base_salary' => 5000000.00,
            'bpjs_kesehatan' => 50000.00,
            'bpjs_ketenagakerjaan' => 100000.00,
            'bonus' => 0.00,
            'overtime' => 0.00,
            'deduction' => 0.00,
            'thr' => 0.00,
            'pph21' => 0.00,
            'total_net' => static function (array $attributes): float {
                $earnings = (float) ($attributes['base_salary'] ?? 0)
                    + (float) ($attributes['bonus'] ?? 0)
                    + (float) ($attributes['overtime'] ?? 0)
                    + (float) ($attributes['thr'] ?? 0);
                $deductions = (float) ($attributes['bpjs_kesehatan'] ?? 0)
                    + (float) ($attributes['bpjs_ketenagakerjaan'] ?? 0)
                    + (float) ($attributes['deduction'] ?? 0)
                    + (float) ($attributes['pph21'] ?? 0);

                return round($earnings - $deductions, 2);
            },
            'notes' => null,
        ];
    }
}
