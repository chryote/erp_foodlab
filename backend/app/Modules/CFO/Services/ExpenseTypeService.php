<?php

namespace App\Modules\CFO\Services;

use App\Models\ExpenseType;
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

class ExpenseTypeService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:expense_types:list';

    /**
     * @return LengthAwarePaginator|Collection<int, ExpenseType>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations(
            $this->query($request),
            $request,
            ['expenseCategory', 'company']
        );

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    public function createExpenseType(array $attributes): ExpenseType
    {
        $expenseType = DB::transaction(
            fn (): ExpenseType => ExpenseType::query()->create($attributes)
        );

        $this->forgetCaches();

        return $expenseType->load(['expenseCategory', 'company']);
    }

    public function updateExpenseType(ExpenseType $expenseType, array $attributes): ExpenseType
    {
        $updated = DB::transaction(function () use ($expenseType, $attributes): ExpenseType {
            $locked = ExpenseType::query()->lockForUpdate()->findOrFail($expenseType->getKey());
            $locked->update($attributes);

            return $locked;
        });

        $this->forgetCaches();

        return $updated->refresh()->load(['expenseCategory', 'company']);
    }

    public function deleteExpenseType(ExpenseType $expenseType): void
    {
        DB::transaction(function () use ($expenseType): void {
            $locked = ExpenseType::query()->lockForUpdate()->findOrFail($expenseType->getKey());

            if ($locked->expenseItems()->exists()) {
                throw ValidationException::withMessages([
                    'expense_type' => [
                        'This expense type is still referenced by expense items.',
                    ],
                ]);
            }

            $locked->delete();
        });

        $this->forgetCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(ExpenseType::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('expense_category_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where(function (Builder $searchQuery) use ($term): void {
                        $searchQuery
                            ->where('name', 'like', $term)
                            ->orWhereHas(
                                'expenseCategory',
                                fn (Builder $categoryQuery) => $categoryQuery->where('name', 'like', $term)
                            );
                    });
                }),
            ])
            ->allowedSorts(['id', 'name', 'created_at', 'updated_at'])
            ->allowedIncludes(['expenseCategory', 'company'])
            ->defaultSort('-id');
    }

    private function forgetCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseItemService::CACHE_KEY_LIST);
    }
}
