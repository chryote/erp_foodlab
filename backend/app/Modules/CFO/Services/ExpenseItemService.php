<?php

namespace App\Modules\CFO\Services;

use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use App\Support\IndexQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ExpenseItemService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:expense_items:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['expenseCategory', 'expenseType', 'company'];

    /**
     * @return LengthAwarePaginator|Collection<int, ExpenseItem>
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

    public function createExpenseItem(array $attributes): ExpenseItem
    {
        $expenseItem = DB::transaction(function () use ($attributes): ExpenseItem {
            return ExpenseItem::query()->create($this->resolveParentIds($attributes));
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseItem->load(self::RELATIONS);
    }

    public function updateExpenseItem(ExpenseItem $expenseItem, array $attributes): ExpenseItem
    {
        $updated = DB::transaction(function () use ($expenseItem, $attributes): ExpenseItem {
            $locked = ExpenseItem::query()->lockForUpdate()->findOrFail($expenseItem->getKey());
            $locked->update($this->resolveParentIds($attributes));

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteExpenseItem(ExpenseItem $expenseItem): void
    {
        DB::transaction(function () use ($expenseItem): void {
            $locked = ExpenseItem::query()->lockForUpdate()->findOrFail($expenseItem->getKey());
            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(ExpenseItem::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('expense_category_id'),
                AllowedFilter::exact('expense_type_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where(function (Builder $searchQuery) use ($term): void {
                        $searchQuery
                            ->where('name', 'like', $term)
                            ->orWhere('detail', 'like', $term)
                            ->orWhereHas(
                                'expenseCategory',
                                fn (Builder $categoryQuery) => $categoryQuery->where('name', 'like', $term)
                            )
                            ->orWhereHas(
                                'expenseType',
                                fn (Builder $typeQuery) => $typeQuery->where('name', 'like', $term)
                            );
                    });
                }),
            ])
            ->allowedSorts(['id', 'name', 'amount', 'purchased_on', 'closing_date', 'created_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('-id');
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function resolveParentIds(array $attributes): array
    {
        if ((empty($attributes['expense_category_id']) || empty($attributes['company_id'])) && ! empty($attributes['expense_type_id'])) {
            $type = ExpenseType::query()->findOrFail($attributes['expense_type_id']);
            $attributes['expense_category_id'] = $attributes['expense_category_id'] ?? $type->expense_category_id;
            $attributes['company_id'] = $attributes['company_id'] ?? $type->company_id;
        }

        return $attributes;
    }
}
