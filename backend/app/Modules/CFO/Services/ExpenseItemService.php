<?php

namespace App\Modules\CFO\Services;

use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ExpenseItemService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:expense_items:list';

    private const RELATIONS = ['expenseCategory', 'expenseType', 'company'];

    /**
     * List or paginate expense items using Spatie QueryBuilder (?filter[...], ?sort=..., ?include=...).
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $queryParams = $request->query();
        $filters = is_array($queryParams['filter'] ?? null) ? $queryParams['filter'] : [];

        foreach (['company_id', 'expense_category_id', 'expense_type_id', 'search'] as $legacyKey) {
            if (! array_key_exists($legacyKey, $filters) && filled($queryParams[$legacyKey] ?? null)) {
                $filters[$legacyKey] = $queryParams[$legacyKey];
            }
        }

        if ($filters !== []) {
            $queryParams['filter'] = $filters;
        }

        $builderRequest = $request->duplicate(query: $queryParams);

        $query = QueryBuilder::for(ExpenseItem::class, $builderRequest)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('expense_category_id'),
                AllowedFilter::exact('expense_type_id'),
                AllowedFilter::callback('search', function ($builder, $value): void {
                    $term = '%' . trim((string) $value) . '%';
                    $builder->where(function ($q) use ($term): void {
                        $q->where('name', 'like', $term)
                            ->orWhere('detail', 'like', $term)
                            ->orWhereHas('expenseCategory', fn ($sq) => $sq->where('name', 'like', $term))
                            ->orWhereHas('expenseType', fn ($sq) => $sq->where('name', 'like', $term));
                    });
                }),
            ])
            ->allowedSorts(['id', 'name', 'amount', 'purchased_on', 'closing_date', 'created_at'])
            ->defaultSort('-id')
            ->allowedIncludes(self::RELATIONS);

        if (! $builderRequest->filled('include')) {
            $query->with(self::RELATIONS);
        }

        $perPage = $request->query('per_page');
        $page = $request->query('page');

        if ($perPage !== null || $page !== null || filled($filters['search'] ?? null)) {
            return $query->paginate(
                max(1, (int) ($perPage ?? 10)),
                ['*'],
                'page',
                max(1, (int) ($page ?? 1))
            );
        }

        if ($filters === [] && ! $builderRequest->filled('sort') && ! $builderRequest->filled('include')) {
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
        DB::transaction(function () use ($expenseItem, $attributes): void {
            $expenseItem->update($this->resolveParentIds($attributes));
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseItem->refresh()->load(self::RELATIONS);
    }

    public function deleteExpenseItem(ExpenseItem $expenseItem): void
    {
        DB::transaction(fn () => $expenseItem->delete());
        Cache::forget(self::CACHE_KEY_LIST);
    }

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
