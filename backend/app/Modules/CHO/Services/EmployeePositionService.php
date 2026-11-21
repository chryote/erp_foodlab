<?php

namespace App\Modules\CHO\Services;

use App\Models\EmployeePosition;
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

class EmployeePositionService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cho:employee_positions:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, EmployeePosition>
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
    public function createEmployeePosition(array $attributes): EmployeePosition
    {
        $employeePosition = DB::transaction(
            fn (): EmployeePosition => EmployeePosition::query()->create($attributes)
        );

        Cache::forget(self::CACHE_KEY_LIST);

        return $employeePosition->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateEmployeePosition(EmployeePosition $employeePosition, array $attributes): EmployeePosition
    {
        $updated = DB::transaction(function () use ($employeePosition, $attributes): EmployeePosition {
            $locked = EmployeePosition::query()->lockForUpdate()->findOrFail($employeePosition->getKey());
            $locked->update($attributes);

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteEmployeePosition(EmployeePosition $employeePosition): void
    {
        DB::transaction(function () use ($employeePosition): void {
            $locked = EmployeePosition::query()->lockForUpdate()->findOrFail($employeePosition->getKey());

            if ($locked->employees()->exists()) {
                throw ValidationException::withMessages([
                    'employee_position' => [
                        'This employee position is still referenced by active employees.',
                    ],
                ]);
            }

            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(EmployeePosition::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where(function (Builder $searchQuery) use ($term): void {
                        $searchQuery
                            ->where('code', 'like', $term)
                            ->orWhere('name', 'like', $term);
                    });
                }),
            ])
            ->allowedSorts(['id', 'code', 'name', 'created_at'])
            ->allowedIncludes(['employees', 'company'])
            ->defaultSort('name', 'id');
    }
}
