<?php

namespace App\Modules\CHO\Services;

use App\Models\Employee;
use App\Modules\CHO\Actions\CreateEmployeeAction;
use App\Modules\CHO\Actions\UpdateEmployeeAction;
use App\Support\IndexQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class EmployeeService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cho:employees:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = [
        'company',
        'employeePosition',
        'employmentStatus',
        'payrollGrade',
        'taxStatus',
        'documents',
    ];

    public function __construct(
        protected CreateEmployeeAction $createEmployeeAction,
        protected UpdateEmployeeAction $updateEmployeeAction,
    ) {}

    /**
     * @return LengthAwarePaginator|Collection<int, Employee>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

        if ($request->boolean('active_company')) {
            $activeCompanyId = active_company_id();

            if ($activeCompanyId !== null) {
                $query->where('company_id', $activeCompanyId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (! $request->boolean('active_company') && IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createEmployee(array $attributes): Employee
    {
        $employee = $this->createEmployeeAction->execute($attributes);

        Cache::forget(self::CACHE_KEY_LIST);

        return $employee->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateEmployee(Employee $employee, array $attributes): Employee
    {
        $updated = $this->updateEmployeeAction->execute($employee, $attributes);

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteEmployee(Employee $employee): void
    {
        DB::transaction(function () use ($employee): void {
            $locked = Employee::query()->lockForUpdate()->findOrFail($employee->getKey());
            $locked->documents()->delete();
            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(Employee::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('employee_position_id'),
                AllowedFilter::exact('employment_status_id'),
                AllowedFilter::exact('payroll_grade_id'),
                AllowedFilter::exact('tax_status_id'),
                AllowedFilter::exact('gender'),
                AllowedFilter::exact('religion'),
                AllowedFilter::exact('blood_type'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where(function (Builder $searchQuery) use ($term): void {
                        $searchQuery
                            ->where('name', 'like', $term)
                            ->orWhere('nickname', 'like', $term)
                            ->orWhere('nik_ktp', 'like', $term)
                            ->orWhere('email', 'like', $term)
                            ->orWhere('phone', 'like', $term);
                    });
                }),
            ])
            ->allowedSorts(['id', 'name', 'nik_ktp', 'birth_date', 'created_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('name', '-id');
    }
}
