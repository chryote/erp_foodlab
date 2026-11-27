<?php

namespace App\Modules\HR\Services;

use App\Models\Company;
use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\EmployeeShift;
use App\Modules\HR\Actions\RecordAttendanceAction;
use App\Support\IndexQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedSort;
use Spatie\QueryBuilder\QueryBuilder;

class EmployeeAttendanceService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:hr:employee_attendances:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company', 'employee', 'employeeShift'];

    public function __construct(
        protected RecordAttendanceAction $recordAttendanceAction,
    ) {}

    /**
     * @return LengthAwarePaginator|Collection<int, EmployeeAttendance>
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
    public function createEmployeeAttendance(array $attributes): EmployeeAttendance
    {
        $employeeAttendance = $this->recordAttendanceAction->execute($attributes);

        Cache::forget(self::CACHE_KEY_LIST);

        return $employeeAttendance->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function scanEmployeeAttendance(array $attributes): EmployeeAttendance
    {
        $employeeAttendance = $this->recordAttendanceAction->scan($attributes);

        Cache::forget(self::CACHE_KEY_LIST);

        return $employeeAttendance->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateEmployeeAttendance(EmployeeAttendance $employeeAttendance, array $attributes): EmployeeAttendance
    {
        $updated = $this->recordAttendanceAction->execute($attributes, $employeeAttendance);

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteEmployeeAttendance(EmployeeAttendance $employeeAttendance): void
    {
        DB::transaction(function () use ($employeeAttendance): void {
            $locked = EmployeeAttendance::query()->lockForUpdate()->findOrFail($employeeAttendance->getKey());
            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(EmployeeAttendance::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('employee_id'),
                AllowedFilter::callback('employee_attendance_code', function (Builder $query, mixed $value): void {
                    $code = trim((string) $value);
                    $query->whereHas('employee', function (Builder $employeeQuery) use ($code): void {
                        $employeeQuery->where('employee_attendance_code', $code);
                    });
                }),
                AllowedFilter::exact('employee_shift_id'),
                AllowedFilter::callback('attendance_date', function (Builder $query, mixed $value): void {
                    $query->whereDate('attendance_date', (string) $value);
                }),
                AllowedFilter::exact('status'),
            ])
            ->allowedSorts([
                'company_id',
                'employee_id',
                'employee_shift_id',
                'attendance_date',
                'clock_in_at',
                'clock_out_at',
                'late_minutes',
                'overtime_minutes',
                'status',
                'notes',
                AllowedSort::callback('company_name', function (Builder $query, bool $descending): void {
                    $query->orderBy(
                        Company::select('name')->whereColumn('companies.id', 'employee_attendances.company_id'),
                        $descending ? 'desc' : 'asc'
                    );
                }),
                AllowedSort::callback('employee_name', function (Builder $query, bool $descending): void {
                    $query->orderBy(
                        Employee::select('name')->whereColumn('employees.id', 'employee_attendances.employee_id'),
                        $descending ? 'desc' : 'asc'
                    );
                }),
                AllowedSort::callback('employee_shift_name', function (Builder $query, bool $descending): void {
                    $query->orderBy(
                        EmployeeShift::select('name')->whereColumn('employee_shifts.id', 'employee_attendances.employee_shift_id'),
                        $descending ? 'desc' : 'asc'
                    );
                }),
            ])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('-attendance_date', '-id');
    }
}
