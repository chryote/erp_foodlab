<?php

namespace Database\Factories;

use App\Enums\PayrollRunStatus;
use App\Models\Company;
use App\Models\PayrollRun;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PayrollRun>
 */
class PayrollRunFactory extends Factory
{
    protected $model = PayrollRun::class;

    private static int $sequence = 1;

    public function definition(): array
    {
        $seq = self::$sequence++;
        $periodDate = CarbonImmutable::create(2024, 1, 1)->addMonths($seq - 1)->format('Y-m-d');

        return [
            'company_id' => Company::factory(),
            'code' => sprintf('PR-%04d', $seq),
            'name' => sprintf('Payroll Periode #%d', $seq),
            'period_date' => $periodDate,
            'status' => PayrollRunStatus::DRAFT,
            'total_base_salary' => 0.00,
            'total_bpjs_kesehatan' => 0.00,
            'total_bpjs_ketenagakerjaan' => 0.00,
            'total_bonus' => 0.00,
            'total_overtime' => 0.00,
            'total_deduction' => 0.00,
            'total_thr' => 0.00,
            'total_pph21' => 0.00,
            'total_net' => 0.00,
            'notes' => null,
            'approved_by' => null,
            'approved_at' => null,
        ];
    }
}
