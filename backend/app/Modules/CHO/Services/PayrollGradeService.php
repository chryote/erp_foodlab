<?php

namespace App\Modules\CHO\Services;

use App\Models\PayrollGrade;
use App\Support\IndexQuery;
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

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, PayrollGrade>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

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
        $payrollGrade = DB::transaction(
            fn (): PayrollGrade => PayrollGrade::query()->create($this->withComputedPayroll($attributes))
        );

        Cache::forget(self::CACHE_KEY_LIST);

        return $payrollGrade->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updatePayrollGrade(PayrollGrade $payrollGrade, array $attributes): PayrollGrade
    {
        $updated = DB::transaction(function () use ($payrollGrade, $attributes): PayrollGrade {
            $locked = PayrollGrade::query()->lockForUpdate()->findOrFail($payrollGrade->getKey());
            $locked->update($this->withComputedPayroll($attributes, $locked));

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
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
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('grade'),
                AllowedFilter::exact('sub_grade'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where(function (Builder $searchQuery) use ($term): void {
                        $searchQuery
                            ->where('level_label', 'like', $term)
                            ->orWhere('grade', 'like', $term)
                            ->orWhere('sub_grade', 'like', $term);
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
            ->allowedIncludes(['employees', 'company'])
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
            ? (float) $attributes['base_salary']
            : (float) ($existing?->base_salary ?? 0);

        $positionAllowance = array_key_exists('position_allowance', $attributes)
            ? (float) ($attributes['position_allowance'] ?? 0)
            : (float) ($existing?->position_allowance ?? 0);

        $totalGross = $baseSalary + $positionAllowance;
        $bpjsKesehatanCompany = (float) round($totalGross * 0.04);
        $bpjsKesehatanEmployee = (float) round($totalGross * 0.01);
        $bpjsKetenagakerjaanCompany = (float) round($totalGross * 0.0394);
        $bpjsKetenagakerjaanEmployee = (float) round($totalGross * 0.02);

        $attributes['base_salary'] = $baseSalary;
        $attributes['position_allowance'] = $positionAllowance;
        $attributes['total_gross'] = $totalGross;
        $attributes['bpjs_kesehatan_company'] = $bpjsKesehatanCompany;
        $attributes['bpjs_kesehatan_employee'] = $bpjsKesehatanEmployee;
        $attributes['bpjs_ketenagakerjaan_company'] = $bpjsKetenagakerjaanCompany;
        $attributes['bpjs_ketenagakerjaan_employee'] = $bpjsKetenagakerjaanEmployee;
        $attributes['net_employee_received'] = $totalGross - $bpjsKesehatanEmployee - $bpjsKetenagakerjaanEmployee;
        $attributes['total_company_cost'] = $totalGross + $bpjsKesehatanCompany + $bpjsKetenagakerjaanCompany;

        return $attributes;
    }
}
