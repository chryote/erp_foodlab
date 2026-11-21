<?php

namespace App\Modules\HR\Services;

use App\Models\EmployeeShift;
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

class EmployeeShiftService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:hr:employee_shifts:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, EmployeeShift>
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
    public function createEmployeeShift(array $attributes): EmployeeShift
    {
        $employeeShift = DB::transaction(
            fn (): EmployeeShift => EmployeeShift::query()->create($attributes)
        );

        Cache::forget(self::CACHE_KEY_LIST);

        return $employeeShift->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateEmployeeShift(EmployeeShift $employeeShift, array $attributes): EmployeeShift
    {
        $updated = DB::transaction(function () use ($employeeShift, $attributes): EmployeeShift {
            $locked = EmployeeShift::query()->lockForUpdate()->findOrFail($employeeShift->getKey());
            $locked->update($attributes);

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteEmployeeShift(EmployeeShift $employeeShift): void
    {
        DB::transaction(function () use ($employeeShift): void {
            $locked = EmployeeShift::query()->lockForUpdate()->findOrFail($employeeShift->getKey());

            if (class_exists(\App\Models\EmployeeAttendance::class) && $locked->employeeAttendances()->exists()) {
                throw ValidationException::withMessages([
                    'employee_shift' => [
                        'This employee shift is still referenced by employee attendances.',
                    ],
                ]);
            }

            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(EmployeeShift::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::partial('code'),
                AllowedFilter::partial('name'),
                AllowedFilter::exact('status'),
                AllowedFilter::callback('is_overnight', function (Builder $query, mixed $value): void {
                    $query->where('is_overnight', filter_var($value, FILTER_VALIDATE_BOOLEAN));
                }),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where(function (Builder $searchQuery) use ($term): void {
                        $searchQuery
                            ->where('code', 'like', $term)
                            ->orWhere('name', 'like', $term)
                            ->orWhere('description', 'like', $term);
                    });
                }),
            ])
            ->allowedSorts(['id', 'code', 'name', 'start_time', 'created_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('start_time', 'id');
    }
}
