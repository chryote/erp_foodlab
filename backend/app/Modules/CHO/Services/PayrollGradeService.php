<?php

namespace App\Modules\CHO\Services;

use App\Models\PayrollGrade;
use App\Support\IndexQuery;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class PayrollGradeService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cho:payroll_grades:list';

    private const MAX_DECIMAL_18_2 = 9999999999999999.99;

    /**
     * @return LengthAwarePaginator|Collection<int, PayrollGrade>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = $this->query($request);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createPayrollGrade(array $attributes): PayrollGrade
    {
        $attributes['sub_grade'] = InputNormalizer::text((string) $attributes['sub_grade']) ?? '';
        if (array_key_exists('level_label', $attributes)) {
            $attributes['level_label'] = $attributes['level_label'] !== null
                ? InputNormalizer::nullableText((string) $attributes['level_label'])
                : null;
        }

        $payrollGrade = DB::transaction(function () use ($attributes): PayrollGrade {
            $this->assertWriteConstraints(
                (int) $attributes['grade'],
                (string) $attributes['sub_grade']
            );

            return PayrollGrade::query()->create($this->withComputedPayroll($attributes));
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $payrollGrade;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updatePayrollGrade(PayrollGrade $payrollGrade, array $attributes): PayrollGrade
    {
        if (array_key_exists('sub_grade', $attributes)) {
            $attributes['sub_grade'] = InputNormalizer::text((string) $attributes['sub_grade']) ?? '';
        }
        if (array_key_exists('level_label', $attributes)) {
            $attributes['level_label'] = $attributes['level_label'] !== null
                ? InputNormalizer::nullableText((string) $attributes['level_label'])
                : null;
        }

        $updated = DB::transaction(function () use ($payrollGrade, $attributes): PayrollGrade {
            $locked = PayrollGrade::query()->lockForUpdate()->findOrFail($payrollGrade->getKey());

            $targetGrade = (int) ($attributes['grade'] ?? $locked->grade);
            $targetSubGrade = (string) ($attributes['sub_grade'] ?? $locked->sub_grade);
            $this->assertWriteConstraints($targetGrade, $targetSubGrade, $locked);

            $locked->update($this->withComputedPayroll($attributes, $locked));

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(EmployeeService::CACHE_KEY_LIST);

        return $updated->refresh();
    }

    public function deletePayrollGrade(PayrollGrade $payrollGrade): void
    {
        DB::transaction(function () use ($payrollGrade): void {
            $locked = PayrollGrade::query()->lockForUpdate()->findOrFail($payrollGrade->getKey());

            if ($locked->employees()->exists()) {
                throw ValidationException::withMessages([
                    'payroll_grade' => [
                        'This payroll grade is still referenced by active employees.',
                    ],
                ]);
            }

            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(PayrollGrade::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('grade'),
                AllowedFilter::exact('sub_grade'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $raw = trim((string) $value);

                    $query->where(function (Builder $searchQuery) use ($escaped, $raw): void {
                        IndexQuery::whereLike($searchQuery, 'level_label', $escaped);
                        IndexQuery::orWhereLike($searchQuery, 'sub_grade', $escaped);

                        if (ctype_digit($raw)) {
                            $searchQuery->orWhere('grade', '=', (int) $raw);
                        }
                    });
                }),
            ])
            ->allowedSorts([
                'id',
                'grade',
                'sub_grade',
                'base_salary',
                'position_allowance',
                'total_gross',
                'net_employee_received',
                'total_company_cost',
                'created_at',
            ])
            ->allowedIncludes(['employees'])
            ->defaultSort('grade', 'sub_grade');
    }

    /**
     * Compute all derived gross, BPJS, net received, and company cost fields server-side.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function withComputedPayroll(array $attributes, ?PayrollGrade $existing = null): array
    {
        $baseSalary = array_key_exists('base_salary', $attributes)
            ? round((float) $attributes['base_salary'], 2)
            : round((float) ($existing?->base_salary ?? 0), 2);

        $positionAllowance = array_key_exists('position_allowance', $attributes)
            ? round((float) ($attributes['position_allowance'] ?? 0), 2)
            : round((float) ($existing?->position_allowance ?? 0), 2);

        $totalGross = round($baseSalary + $positionAllowance, 2);
        $bpjsKesehatanCompany = (float) round($totalGross * 0.04);
        $bpjsKesehatanEmployee = (float) round($totalGross * 0.01);
        $bpjsKetenagakerjaanCompany = (float) round($totalGross * 0.0394);
        $bpjsKetenagakerjaanEmployee = (float) round($totalGross * 0.02);
        $netEmployeeReceived = round($totalGross - $bpjsKesehatanEmployee - $bpjsKetenagakerjaanEmployee, 2);
        $totalCompanyCost = round($totalGross + $bpjsKesehatanCompany + $bpjsKetenagakerjaanCompany, 2);

        if ($totalCompanyCost > self::MAX_DECIMAL_18_2) {
            throw ValidationException::withMessages([
                'base_salary' => ['The computed total company cost exceeds the maximum supported decimal(18,2) amount.'],
            ]);
        }

        $attributes['base_salary'] = $baseSalary;
        $attributes['position_allowance'] = $positionAllowance;
        $attributes['total_gross'] = $totalGross;
        $attributes['bpjs_kesehatan_company'] = $bpjsKesehatanCompany;
        $attributes['bpjs_kesehatan_employee'] = $bpjsKesehatanEmployee;
        $attributes['bpjs_ketenagakerjaan_company'] = $bpjsKetenagakerjaanCompany;
        $attributes['bpjs_ketenagakerjaan_employee'] = $bpjsKetenagakerjaanEmployee;
        $attributes['net_employee_received'] = $netEmployeeReceived;
        $attributes['total_company_cost'] = $totalCompanyCost;

        return $attributes;
    }

    private function assertWriteConstraints(int $grade, string $subGrade, ?PayrollGrade $existing = null): void
    {
        WriteGuard::assertUniqueActive(
            PayrollGrade::query(),
            'sub_grade',
            $subGrade,
            [
                'grade' => $grade,
            ],
            'sub_grade',
            'The combination of grade and sub grade has already been taken.',
            $existing?->getKey()
        );
    }
}
