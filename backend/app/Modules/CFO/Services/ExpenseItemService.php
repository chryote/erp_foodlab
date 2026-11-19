<?php

namespace App\Modules\CFO\Services;

use App\Models\ExpenseItem;
use App\Models\ExpenseType;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ExpenseItemService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:expense_items:list';

    public function listExpenseItems(): Collection
    {
        return Cache::remember(self::CACHE_KEY_LIST, 60, function () {
            return ExpenseItem::query()
                ->with(['expenseCategory', 'expenseType', 'company'])
                ->orderByDesc('id')
                ->get();
        });
    }

    public function listFilteredExpenseItems(
        ?int $expenseCategoryId = null,
        ?int $expenseTypeId = null,
        ?int $companyId = null
    ): Collection {
        return $this->listExpenseItems()
            ->when($expenseCategoryId !== null, fn (Collection $items) => $items->where('expense_category_id', $expenseCategoryId))
            ->when($expenseTypeId !== null, fn (Collection $items) => $items->where('expense_type_id', $expenseTypeId))
            ->when($companyId !== null, fn (Collection $items) => $items->where('company_id', $companyId))
            ->values();
    }

    public function listExpenseItemByExpenseCategory(int $expenseCategoryId): Collection
    {
        return $this->listExpenseItems()
            ->where('expense_category_id', $expenseCategoryId)
            ->values();
    }

    public function listExpenseItemByExpenseType(int $expenseTypeId): Collection
    {
        return $this->listExpenseItems()
            ->where('expense_type_id', $expenseTypeId)
            ->values();
    }

    public function paginateExpenseItems(
        ?string $search = null,
        int $perPage = 10,
        int $page = 1,
        ?int $expenseCategoryId = null,
        ?int $expenseTypeId = null,
        ?int $companyId = null
    ): LengthAwarePaginator {
        $query = ExpenseItem::query()
            ->with(['expenseCategory', 'expenseType', 'company'])
            ->orderByDesc('id');

        if ($expenseCategoryId !== null) {
            $query->where('expense_category_id', $expenseCategoryId);
        }

        if ($expenseTypeId !== null) {
            $query->where('expense_type_id', $expenseTypeId);
        }

        if ($companyId !== null) {
            $query->where('company_id', $companyId);
        }

        if ($search !== null && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhereHas('expenseCategory', function ($expenseCategoryQuery) use ($term) {
                        $expenseCategoryQuery->where('name', 'like', $term);
                    })
                    ->orWhereHas('expenseType', function ($expenseTypeQuery) use ($term) {
                        $expenseTypeQuery->where('name', 'like', $term);
                    });
            });
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function createExpenseItem(array $attributes): ExpenseItem
    {
        if ((empty($attributes['expense_category_id']) || empty($attributes['company_id'])) && ! empty($attributes['expense_type_id'])) {
            $type = ExpenseType::query()->findOrFail($attributes['expense_type_id']);
            $attributes['expense_category_id'] = $attributes['expense_category_id'] ?? $type->expense_category_id;
            $attributes['company_id'] = $attributes['company_id'] ?? $type->company_id;
        }

        $expenseItem = ExpenseItem::query()->create($attributes);
        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseItem->load(['expenseCategory', 'expenseType', 'company']);
    }

    public function updateExpenseItem(ExpenseItem $expenseItem, array $attributes): ExpenseItem
    {
        if ((empty($attributes['expense_category_id']) || empty($attributes['company_id'])) && ! empty($attributes['expense_type_id'])) {
            $type = ExpenseType::query()->findOrFail($attributes['expense_type_id']);
            $attributes['expense_category_id'] = $attributes['expense_category_id'] ?? $type->expense_category_id;
            $attributes['company_id'] = $attributes['company_id'] ?? $type->company_id;
        }

        $expenseItem->update($attributes);
        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseItem->refresh()->load(['expenseCategory', 'expenseType', 'company']);
    }

    public function deleteExpenseItem(ExpenseItem $expenseItem): void
    {
        $expenseItem->delete();
        Cache::forget(self::CACHE_KEY_LIST);
    }
}
