<?php

namespace App\Modules\CHO\Services;

use App\Enums\AttendanceStatusEnum;
use App\Enums\PayrollGroup;
use App\Enums\PayrollItemStatus;
use App\Enums\PayrollRunStatus;
use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\TaxStatus;
use App\Support\ActiveCompany;
use App\Support\InputNormalizer;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollService
{
    /**
     * Monthly payroll cutoff day (22nd of the period month).
     */
    public const CUTOFF_DAY = 22;

    /**
     * Start day of the previous month for the cutoff window
     * (e.g. January period runs from 21 December to 22 January).
     */
    public const PERIOD_START_DAY = 21;

    /**
     * Standard effective working days per period used to prorate attendance-based salary.
     */
    public const EFFECTIVE_WORK_DAYS = 25;

    private const MAX_DECIMAL_18_2 = 9999999999999999.99;

    private const ANNUAL_BIAYA_JABATAN_RATE = 0.05;

    private const ANNUAL_BIAYA_JABATAN_CAP = 6_000_000.0;

    private const DEFAULT_PTKP_TK0 = 54_000_000.0;

    /**
     * Annual PTKP thresholds keyed by Indonesian tax status code.
     *
     * @var array<string, float>
     */
    private const PTKP_BY_CODE = [
        'TK/0' => 54_000_000.0,
        'TK/1' => 58_500_000.0,
        'TK/2' => 63_000_000.0,
        'TK/3' => 67_500_000.0,
        'K/0' => 58_500_000.0,
        'K/1' => 63_000_000.0,
        'K/2' => 67_500_000.0,
        'K/3' => 72_000_000.0,
        'K/I/0' => 112_500_000.0,
        'K/I/1' => 117_000_000.0,
        'K/I/2' => 121_500_000.0,
        'K/I/3' => 126_000_000.0,
    ];

    /**
     * Progressive Pasal 17 annual tax brackets: [upper_bound_or_null, rate].
     *
     * @var list<array{limit: float|null, rate: float}>
     */
    private const PASAL_17_BRACKETS = [
        ['limit' => 60_000_000.0, 'rate' => 0.05],
        ['limit' => 250_000_000.0, 'rate' => 0.15],
        ['limit' => 500_000_000.0, 'rate' => 0.25],
        ['limit' => 5_000_000_000.0, 'rate' => 0.30],
        ['limit' => null, 'rate' => 0.35],
    ];

    /**
     * Resolve the normalized period month and cutoff attendance date window.
     *
     * @return array{period: string, period_date: string, cutoff_start_date: string, cutoff_end_date: string}
     */
    public function resolvePeriodWindow(string $period): array
    {
        $trimmed = trim($period);
        $monthStart = null;

        if (preg_match('/^\d{4}-\d{2}$/', $trimmed) === 1) {
            $parsed = CarbonImmutable::createFromFormat('!Y-m', $trimmed);
            if ($parsed !== false && $parsed->format('Y-m') === $trimmed) {
                $monthStart = $parsed->startOfMonth();
            }
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed) === 1) {
            $parsed = CarbonImmutable::createFromFormat('!Y-m-d', $trimmed);
            if ($parsed !== false && $parsed->format('Y-m-d') === $trimmed) {
                $monthStart = $parsed->startOfMonth();
            }
        }

        if ($monthStart === null) {
            throw ValidationException::withMessages([
                'period' => ['Format periode harus YYYY-MM atau YYYY-MM-DD yang valid.'],
            ]);
        }

        $cutoffStart = $monthStart->subMonthNoOverflow()->day(self::PERIOD_START_DAY);
        $cutoffEnd = $monthStart->day(self::CUTOFF_DAY);

        return [
            'period' => $monthStart->format('Y-m'),
            'period_date' => $monthStart->format('Y-m-d'),
            'cutoff_start_date' => $cutoffStart->format('Y-m-d'),
            'cutoff_end_date' => $cutoffEnd->format('Y-m-d'),
        ];
    }

    public function countAttendanceDays(int $companyId, int $employeeId, string $startDate, string $endDate): int
    {
        return (int) EmployeeAttendance::query()
            ->where('company_id', $companyId)
            ->where('employee_id', $employeeId)
            ->whereNull('deleted_at')
            ->whereDate('attendance_date', '>=', $startDate)
            ->whereDate('attendance_date', '<=', $endDate)
            ->whereIn('status', [
                AttendanceStatusEnum::PRESENT->value,
                AttendanceStatusEnum::LATE->value,
            ])
            ->count();
    }

    public function calculateBaseSalary(Employee $employee, int $attendanceDays): float
    {
        $grade = $employee->payrollGrade;
        $gradeSalary = (float) ($grade?->total_gross ?? $grade?->base_salary ?? 0.0);

        if ($gradeSalary <= 0.0 || $attendanceDays <= 0) {
            return 0.0;
        }

        return round(($gradeSalary / self::EFFECTIVE_WORK_DAYS) * $attendanceDays, 2);
    }

    /**
     * @return array{bpjs_kesehatan: float, bpjs_ketenagakerjaan: float}
     */
    public function calculateBpjs(Employee $employee, float $baseSalary): array
    {
        $grade = $employee->payrollGrade;
        if ($baseSalary <= 0.0 || $grade === null) {
            return [
                'bpjs_kesehatan' => 0.0,
                'bpjs_ketenagakerjaan' => 0.0,
            ];
        }

        $bpjsKesehatan = trim((string) ($employee->bpjs_kesehatan ?? '')) !== ''
            ? round((float) $grade->bpjs_kesehatan_employee, 2)
            : 0.0;
        $bpjsKetenagakerjaan = trim((string) ($employee->bpjs_ketenagakerjaan ?? '')) !== ''
            ? round((float) $grade->bpjs_ketenagakerjaan_employee, 2)
            : 0.0;

        return [
            'bpjs_kesehatan' => $bpjsKesehatan,
            'bpjs_ketenagakerjaan' => $bpjsKetenagakerjaan,
        ];
    }

    public function resolvePtkpAmount(?TaxStatus $taxStatus): float
    {
        if ($taxStatus === null) {
            return self::DEFAULT_PTKP_TK0;
        }

        $candidates = [
            strtoupper(str_replace(' ', '', (string) ($taxStatus->code ?? ''))),
            strtoupper(str_replace(' ', '', (string) ($taxStatus->name ?? ''))),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate === '') {
                continue;
            }

            if (isset(self::PTKP_BY_CODE[$candidate])) {
                return self::PTKP_BY_CODE[$candidate];
            }

            if (preg_match('/\b(K\/I\/[0-3]|K\/[0-3]|TK\/[0-3])\b/', $candidate, $matches) === 1) {
                return self::PTKP_BY_CODE[$matches[1]];
            }

            if (preg_match('/^(TK|K)([0-3])$/', $candidate, $matches) === 1) {
                $normalizedCode = $matches[1].'/'.$matches[2];
                if (isset(self::PTKP_BY_CODE[$normalizedCode])) {
                    return self::PTKP_BY_CODE[$normalizedCode];
                }
            }
        }

        $nameUpper = strtoupper((string) ($taxStatus->name ?? ''));
        if ($nameUpper !== '' && preg_match('/([0-3])/', $nameUpper, $depMatch) === 1) {
            $dependents = $depMatch[1];
            $prefix = str_contains($nameUpper, 'TIDAK KAWIN') ? 'TK' : (str_contains($nameUpper, 'KAWIN') ? 'K' : null);
            if ($prefix !== null && isset(self::PTKP_BY_CODE["{$prefix}/{$dependents}"])) {
                return self::PTKP_BY_CODE["{$prefix}/{$dependents}"];
            }
        }

        return self::DEFAULT_PTKP_TK0;
    }

    public function calculatePph21(
        float $baseSalary,
        float $bpjsKesehatan,
        float $bpjsKetenagakerjaan,
        float $bonus,
        float $overtime,
        float $deduction,
        float $thr,
        ?TaxStatus $taxStatus = null,
    ): float {
        $monthlyTaxableIncome = max(
            0.0,
            ($baseSalary + $bonus + $overtime + $thr)
            - ($bpjsKesehatan + $bpjsKetenagakerjaan + $deduction)
        );

        if ($monthlyTaxableIncome <= 0.0) {
            return 0.0;
        }

        $annualGross = $monthlyTaxableIncome * 12;
        $biayaJabatan = min(self::ANNUAL_BIAYA_JABATAN_CAP, $annualGross * self::ANNUAL_BIAYA_JABATAN_RATE);
        $annualNet = max(0.0, $annualGross - $biayaJabatan);
        $ptkp = $this->resolvePtkpAmount($taxStatus);

        $pkp = max(0.0, floor(($annualNet - $ptkp) / 1000.0) * 1000.0);
        if ($pkp <= 0.0) {
            return 0.0;
        }

        $annualTax = 0.0;
        $previousLimit = 0.0;

        foreach (self::PASAL_17_BRACKETS as $bracket) {
            $limit = $bracket['limit'];
            $rate = $bracket['rate'];

            if ($limit === null) {
                $taxableSlice = max(0.0, $pkp - $previousLimit);
                $annualTax += $taxableSlice * $rate;
                break;
            }

            if ($pkp <= $previousLimit) {
                break;
            }

            $taxableSlice = min($pkp, $limit) - $previousLimit;
            if ($taxableSlice > 0.0) {
                $annualTax += $taxableSlice * $rate;
            }

            $previousLimit = $limit;
        }

        return (float) round($annualTax / 12.0, 0);
    }

    public function calculateTotalNet(
        float $baseSalary,
        float $bpjsKesehatan,
        float $bpjsKetenagakerjaan,
        float $bonus,
        float $overtime,
        float $deduction,
        float $thr,
        float $pph21,
    ): float {
        return round(
            ($baseSalary + $bonus + $overtime + $thr)
            - ($bpjsKesehatan + $bpjsKetenagakerjaan + $deduction + $pph21),
            2
        );
    }

    /**
     * Build the payroll input workspace for a company and period month.
     *
     * @return array{
     *     period: string,
     *     period_date: string,
     *     cutoff_start_date: string,
     *     cutoff_end_date: string,
     *     cutoff_day: int,
     *     period_start_day: int,
     *     effective_work_days: int,
     *     company: Company|null,
     *     payroll_run: PayrollRun|null,
     *     rows: list<array<string, mixed>>
     * }
     */
    public function workspace(?int $companyId, string $period): array
    {
        $window = $this->resolvePeriodWindow($period);

        if ($companyId !== null) {
            $company = Company::query()
                ->whereNull('deleted_at')
                ->find($companyId);

            if ($company === null) {
                throw ValidationException::withMessages([
                    'company_id' => ['The selected company is invalid or has been deleted.'],
                ]);
            }
        } else {
            $activeCompanyId = ActiveCompany::id();
            $company = $activeCompanyId !== null
                ? Company::query()->whereNull('deleted_at')->find($activeCompanyId)
                : null;
            $company ??= Company::query()->whereNull('deleted_at')->orderBy('id')->first();

            if ($company === null) {
                return [
                    ...$window,
                    'cutoff_day' => self::CUTOFF_DAY,
                    'period_start_day' => self::PERIOD_START_DAY,
                    'effective_work_days' => self::EFFECTIVE_WORK_DAYS,
                    'company' => null,
                    'payroll_run' => null,
                    'rows' => [],
                ];
            }

            $companyId = (int) $company->id;
        }

        $payrollRun = PayrollRun::query()
            ->with(['company', 'approver'])
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->whereDate('period_date', $window['period_date'])
            ->first();

        $employees = Employee::query()
            ->with(['employeePosition', 'employmentStatus', 'payrollGrade', 'taxStatus'])
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        $attendanceCounts = EmployeeAttendance::query()
            ->selectRaw('employee_id, COUNT(*) as total_days')
            ->where('company_id', $companyId)
            ->whereNull('deleted_at')
            ->whereDate('attendance_date', '>=', $window['cutoff_start_date'])
            ->whereDate('attendance_date', '<=', $window['cutoff_end_date'])
            ->whereIn('status', [
                AttendanceStatusEnum::PRESENT->value,
                AttendanceStatusEnum::LATE->value,
            ])
            ->groupBy('employee_id')
            ->pluck('total_days', 'employee_id');

        $existingItems = $payrollRun !== null
            ? PayrollItem::query()
                ->with(['finalizer'])
                ->whereNull('deleted_at')
                ->where('company_id', $companyId)
                ->where('payroll_run_id', $payrollRun->id)
                ->get()
                ->keyBy('employee_id')
            : collect();

        $rows = [];
        foreach ($employees as $employee) {
            /** @var PayrollItem|null $existingItem */
            $existingItem = $existingItems->get($employee->id);
            $itemStatus = $existingItem?->status instanceof PayrollItemStatus
                ? $existingItem->status
                : PayrollItemStatus::tryFrom((string) ($existingItem?->status ?? PayrollItemStatus::DRAFT->value));
            $isFinalized = $itemStatus === PayrollItemStatus::FINALIZED;

            $attendanceDays = $isFinalized
                ? (int) ($existingItem?->attendance_days ?? 0)
                : (int) ($attendanceCounts->get($employee->id) ?? 0);

            $payrollGroup = $this->resolvePayrollGroup($employee, $existingItem);

            if ($isFinalized && $existingItem !== null) {
                $baseSalary = round((float) $existingItem->base_salary, 2);
                $bpjsKesehatan = round((float) $existingItem->bpjs_kesehatan, 2);
                $bpjsKetenagakerjaan = round((float) $existingItem->bpjs_ketenagakerjaan, 2);
                $bonus = round((float) $existingItem->bonus, 2);
                $overtime = round((float) $existingItem->overtime, 2);
                $deduction = round((float) $existingItem->deduction, 2);
                $thr = round((float) $existingItem->thr, 2);
                $pph21 = round((float) $existingItem->pph21, 2);
                $totalNet = round((float) $existingItem->total_net, 2);
            } else {
                $baseSalary = $this->calculateBaseSalary($employee, $attendanceDays);
                $bpjs = $this->calculateBpjs($employee, $baseSalary);
                $bpjsKesehatan = $bpjs['bpjs_kesehatan'];
                $bpjsKetenagakerjaan = $bpjs['bpjs_ketenagakerjaan'];
                $bonus = round((float) ($existingItem?->bonus ?? 0.0), 2);
                $overtime = round((float) ($existingItem?->overtime ?? 0.0), 2);
                $deduction = round((float) ($existingItem?->deduction ?? 0.0), 2);
                $thr = round((float) ($existingItem?->thr ?? 0.0), 2);
                $pph21 = $this->calculatePph21(
                    $baseSalary,
                    $bpjsKesehatan,
                    $bpjsKetenagakerjaan,
                    $bonus,
                    $overtime,
                    $deduction,
                    $thr,
                    $employee->taxStatus,
                );
                $totalNet = $this->calculateTotalNet(
                    $baseSalary,
                    $bpjsKesehatan,
                    $bpjsKetenagakerjaan,
                    $bonus,
                    $overtime,
                    $deduction,
                    $thr,
                    $pph21,
                );
            }

            $rows[] = [
                'employee_id' => (int) $employee->id,
                'employee' => $employee,
                'payroll_item_id' => $existingItem !== null ? (int) $existingItem->id : null,
                'payroll_run_id' => $payrollRun !== null ? (int) $payrollRun->id : null,
                'payroll_group' => $payrollGroup->value,
                'attendance_days' => $attendanceDays,
                'effective_work_days' => self::EFFECTIVE_WORK_DAYS,
                'bank_account_number' => $existingItem?->bank_account_number,
                'base_salary' => $baseSalary,
                'bpjs_kesehatan' => $bpjsKesehatan,
                'bpjs_ketenagakerjaan' => $bpjsKetenagakerjaan,
                'bonus' => $bonus,
                'overtime' => $overtime,
                'deduction' => $deduction,
                'thr' => $thr,
                'pph21' => $pph21,
                'total_net' => $totalNet,
                'status' => $isFinalized ? PayrollItemStatus::FINALIZED->value : PayrollItemStatus::DRAFT->value,
                'notes' => $existingItem?->notes,
                'finalized_by' => $existingItem?->finalized_by !== null ? (int) $existingItem->finalized_by : null,
                'finalized_at' => $existingItem?->finalized_at?->toISOString(),
            ];
        }

        return [
            ...$window,
            'cutoff_day' => self::CUTOFF_DAY,
            'period_start_day' => self::PERIOD_START_DAY,
            'effective_work_days' => self::EFFECTIVE_WORK_DAYS,
            'company' => $company,
            'payroll_run' => $payrollRun,
            'rows' => $rows,
        ];
    }

    /**
     * Save or finalize an individual employee's payroll row for a given period.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function saveEmployeePayroll(array $attributes, bool $finalize = false): PayrollItem
    {
        $companyId = (int) $attributes['company_id'];
        $employeeId = (int) $attributes['employee_id'];
        $window = $this->resolvePeriodWindow((string) $attributes['period']);

        $bonus = round((float) ($attributes['bonus'] ?? 0), 2);
        $overtime = round((float) ($attributes['overtime'] ?? 0), 2);
        $deduction = round((float) ($attributes['deduction'] ?? 0), 2);
        $thr = round((float) ($attributes['thr'] ?? 0), 2);
        $notes = array_key_exists('notes', $attributes) && $attributes['notes'] !== null
            ? InputNormalizer::nullableText((string) $attributes['notes'])
            : null;
        $bankAccountNumber = array_key_exists('bank_account_number', $attributes) && $attributes['bank_account_number'] !== null
            ? InputNormalizer::nullableText((string) $attributes['bank_account_number'])
            : null;

        $payrollItem = DB::transaction(function () use (
            $companyId,
            $employeeId,
            $window,
            $bonus,
            $overtime,
            $deduction,
            $thr,
            $notes,
            $bankAccountNumber,
            $finalize,
            $attributes,
        ): PayrollItem {
            $companyExists = Company::query()
                ->whereNull('deleted_at')
                ->sharedLock()
                ->whereKey($companyId)
                ->exists();

            if (! $companyExists) {
                throw ValidationException::withMessages([
                    'company_id' => ['The selected company is invalid or has been deleted.'],
                ]);
            }

            $employee = Employee::query()
                ->with(['employeePosition', 'payrollGrade', 'taxStatus'])
                ->whereNull('deleted_at')
                ->where('company_id', $companyId)
                ->sharedLock()
                ->find($employeeId);

            if ($employee === null) {
                throw ValidationException::withMessages([
                    'employee_id' => ['The selected employee does not belong to the specified company.'],
                ]);
            }

            $payrollRun = $this->findOrCreateDraftRun($companyId, $window['period'], $window['period_date']);

            $runStatus = $payrollRun->status instanceof PayrollRunStatus
                ? $payrollRun->status
                : PayrollRunStatus::tryFrom((string) $payrollRun->status);

            if (in_array($runStatus, [PayrollRunStatus::APPROVED, PayrollRunStatus::VOID], true)) {
                throw ValidationException::withMessages([
                    'period' => ['Periode payroll ini sudah disetujui atau dibatalkan dan tidak dapat diubah.'],
                ]);
            }

            $existingItem = PayrollItem::query()
                ->whereNull('deleted_at')
                ->where('company_id', $companyId)
                ->where('payroll_run_id', $payrollRun->id)
                ->where('employee_id', $employeeId)
                ->lockForUpdate()
                ->first();

            if ($existingItem !== null) {
                $existingStatus = $existingItem->status instanceof PayrollItemStatus
                    ? $existingItem->status
                    : PayrollItemStatus::tryFrom((string) $existingItem->status);

                if ($existingStatus === PayrollItemStatus::FINALIZED) {
                    throw ValidationException::withMessages([
                        'employee_id' => ['Payroll karyawan ini sudah difinalisasi untuk periode ini.'],
                    ]);
                }
            }

            $attendanceDays = $this->countAttendanceDays(
                $companyId,
                $employeeId,
                $window['cutoff_start_date'],
                $window['cutoff_end_date'],
            );

            $baseSalary = $this->calculateBaseSalary($employee, $attendanceDays);
            $bpjs = $this->calculateBpjs($employee, $baseSalary);
            $bpjsKesehatan = $bpjs['bpjs_kesehatan'];
            $bpjsKetenagakerjaan = $bpjs['bpjs_ketenagakerjaan'];

            $pph21 = $this->calculatePph21(
                $baseSalary,
                $bpjsKesehatan,
                $bpjsKetenagakerjaan,
                $bonus,
                $overtime,
                $deduction,
                $thr,
                $employee->taxStatus,
            );

            $totalNet = $this->calculateTotalNet(
                $baseSalary,
                $bpjsKesehatan,
                $bpjsKetenagakerjaan,
                $bonus,
                $overtime,
                $deduction,
                $thr,
                $pph21,
            );

            if ($totalNet < 0) {
                throw ValidationException::withMessages([
                    'total_net' => ['Total gaji bersih (Total Net) tidak boleh negatif.'],
                ]);
            }

            if ($totalNet > self::MAX_DECIMAL_18_2) {
                throw ValidationException::withMessages([
                    'total_net' => ['Total gaji bersih melebihi batas maksimal decimal(18,2).'],
                ]);
            }

            $payrollGroup = array_key_exists('payroll_group', $attributes) && $attributes['payroll_group'] !== null
                ? PayrollGroup::from((string) $attributes['payroll_group'])
                : $this->resolvePayrollGroup($employee, $existingItem);

            $itemPayload = [
                'company_id' => $companyId,
                'payroll_run_id' => $payrollRun->id,
                'employee_id' => $employeeId,
                'employee_position_id' => $employee->employee_position_id,
                'payroll_group' => $payrollGroup->value,
                'attendance_days' => $attendanceDays,
                'bank_account_number' => array_key_exists('bank_account_number', $attributes)
                    ? $bankAccountNumber
                    : $existingItem?->bank_account_number,
                'base_salary' => $baseSalary,
                'bpjs_kesehatan' => $bpjsKesehatan,
                'bpjs_ketenagakerjaan' => $bpjsKetenagakerjaan,
                'bonus' => $bonus,
                'overtime' => $overtime,
                'deduction' => $deduction,
                'thr' => $thr,
                'pph21' => $pph21,
                'total_net' => $totalNet,
                'status' => $finalize ? PayrollItemStatus::FINALIZED->value : PayrollItemStatus::DRAFT->value,
                'notes' => array_key_exists('notes', $attributes) ? $notes : $existingItem?->notes,
                'finalized_by' => $finalize ? auth()->id() : null,
                'finalized_at' => $finalize ? now() : null,
            ];

            if ($existingItem !== null) {
                $existingItem->update($itemPayload);
                $savedItem = $existingItem;
            } else {
                $savedItem = PayrollItem::query()->create($itemPayload);
            }

            PayrollItemService::syncPayrollRunTotals($payrollRun);

            return $savedItem;
        });

        $this->forgetCaches($companyId);

        return $payrollItem->refresh()->load([
            'company',
            'payrollRun',
            'employee.employeePosition',
            'employee.employmentStatus',
            'employee.payrollGrade',
            'employee.taxStatus',
            'employeePosition',
            'finalizer',
        ]);
    }

    private function findOrCreateDraftRun(int $companyId, string $period, string $periodDate): PayrollRun
    {
        $existing = PayrollRun::query()
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->whereDate('period_date', $periodDate)
            ->lockForUpdate()
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        $baseCode = 'PR-'.$period;
        $code = $baseCode;
        $suffix = 1;
        while (
            PayrollRun::query()
                ->whereNull('deleted_at')
                ->where('company_id', $companyId)
                ->whereRaw('LOWER(code) = ?', [strtolower($code)])
                ->sharedLock()
                ->exists()
        ) {
            $suffix++;
            $code = "{$baseCode}-{$suffix}";
        }

        $baseName = 'Payroll '.$period;
        $name = $baseName;
        $nameSuffix = 1;
        while (
            PayrollRun::query()
                ->whereNull('deleted_at')
                ->where('company_id', $companyId)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->sharedLock()
                ->exists()
        ) {
            $nameSuffix++;
            $name = "{$baseName} ({$nameSuffix})";
        }

        return PayrollRun::query()->create([
            'company_id' => $companyId,
            'code' => $code,
            'name' => $name,
            'period_date' => $periodDate,
            'status' => PayrollRunStatus::DRAFT->value,
        ]);
    }

    private function resolvePayrollGroup(Employee $employee, ?PayrollItem $existing = null): PayrollGroup
    {
        if ($existing !== null) {
            if ($existing->payroll_group instanceof PayrollGroup) {
                return $existing->payroll_group;
            }

            $parsed = PayrollGroup::tryFrom((string) $existing->payroll_group);
            if ($parsed !== null) {
                return $parsed;
            }
        }

        $positionName = strtolower((string) ($employee->employeePosition?->name ?? ''));
        if ($positionName !== '' && str_contains($positionName, 'outlet')) {
            return PayrollGroup::OUTLET;
        }

        return PayrollGroup::OFFICE;
    }

    private function forgetCaches(int $companyId): void
    {
        PayrollItemService::forgetListCache();
        PayrollRunService::forgetListCache();
        Cache::forget(ChoService::CACHE_KEY);
        ActiveCompany::forgetCompanyCache($companyId);
    }
}
