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
use Illuminate\Validation\ValidationException;
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

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request);

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
    public function createEmployee(array $attributes): Employee
    {
        $employee = $this->createEmployeeAction->execute($attributes);

        $this->forgetCaches();

        return $employee->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateEmployee(Employee $employee, array $attributes): Employee
    {
        $updated = $this->updateEmployeeAction->execute($employee, $attributes);

        $this->forgetCaches();

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteEmployee(Employee $employee): void
    {
        DB::transaction(function () use ($employee): void {
            $locked = Employee::query()->lockForUpdate()->findOrFail($employee->getKey());

            if (
                $locked->employeeAttendances()->exists()
                || $locked->employeeShiftAssignments()->exists()
                || $locked->expenseItems()->exists()
                || $locked->payrollItems()->exists()
            ) {
                throw ValidationException::withMessages([
                    'employee' => [
                        'This employee is still referenced by active attendances, shift assignments, expense items, or payroll items.',
                    ],
                ]);
            }

            $locked->documents()->delete();
            $locked->delete();
        });

        $this->forgetCaches();
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
                AllowedFilter::exact('employee_attendance_code'),
                AllowedFilter::exact('gender'),
                AllowedFilter::exact('religion'),
                AllowedFilter::exact('blood_type'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value) use ($request): void {
                    IndexQuery::applySearch($query, $value, function (Builder $searchQuery, string $escaped): void {
                        $searchQuery->where(function (Builder $likeQuery) use ($escaped): void {
                            IndexQuery::whereLike($likeQuery, 'name', $escaped);
                            IndexQuery::orWhereLike($likeQuery, 'nickname', $escaped);
                            IndexQuery::orWhereLike($likeQuery, 'nik_ktp', $escaped);
                            IndexQuery::orWhereLike($likeQuery, 'employee_attendance_code', $escaped);
                            IndexQuery::orWhereLike($likeQuery, 'email', $escaped);
                            IndexQuery::orWhereLike($likeQuery, 'phone', $escaped);
                        });
                    }, request: $request);
                }),
            ])
            ->allowedSorts(['id', 'name', 'nik_ktp', 'employee_attendance_code', 'birth_date', 'created_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('name', '-id');
    }

    private function forgetCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(PayrollItemService::CACHE_KEY_LIST);
        Cache::forget('erp_foodlab:hr:employee_attendances:list');
        Cache::forget('erp_foodlab:hr:employee_shift_assignments:list');
    }
}
