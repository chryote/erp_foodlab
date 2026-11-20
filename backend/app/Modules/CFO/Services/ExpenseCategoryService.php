<?php

namespace App\Modules\CFO\Services;

use App\Models\ExpenseCategory;
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

class ExpenseCategoryService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:expense_categories:list';

    /**
     * @return LengthAwarePaginator|Collection<int, ExpenseCategory>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, ['company']);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    public function createExpenseCategory(array $attributes): ExpenseCategory
    {
        $expenseCategory = DB::transaction(
            fn (): ExpenseCategory => ExpenseCategory::query()->create($attributes)
        );

        $this->forgetCaches();

        return $expenseCategory->load('company');
    }

    public function updateExpenseCategory(ExpenseCategory $expenseCategory, array $attributes): ExpenseCategory
    {
        $updated = DB::transaction(function () use ($expenseCategory, $attributes): ExpenseCategory {
            $locked = ExpenseCategory::query()->lockForUpdate()->findOrFail($expenseCategory->getKey());
            $locked->update($attributes);

            return $locked;
        });

        $this->forgetCaches();

        return $updated->refresh()->load('company');
    }

    public function deleteExpenseCategory(ExpenseCategory $expenseCategory): void
    {
        DB::transaction(function () use ($expenseCategory): void {
            $locked = ExpenseCategory::query()->lockForUpdate()->findOrFail($expenseCategory->getKey());

            if ($locked->expenseTypes()->exists() || $locked->expenseItems()->exists()) {
                throw ValidationException::withMessages([
                    'expense_category' => [
                        'This expense category is still referenced by expense types or items.',
                    ],
                ]);
            }

            $locked->delete();
        });

        $this->forgetCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(ExpenseCategory::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $query->where('name', 'like', '%'.trim((string) $value).'%');
                }),
            ])
            ->allowedSorts(['id', 'name', 'created_at', 'updated_at'])
            ->allowedIncludes(['company'])
            ->defaultSort('-id');
    }

    private function forgetCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseTypeService::CACHE_KEY_LIST);
        Cache::forget(ExpenseItemService::CACHE_KEY_LIST);
    }
}
