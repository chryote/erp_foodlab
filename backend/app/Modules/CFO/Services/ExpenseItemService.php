<?php

namespace App\Modules\CFO\Services;

use App\Models\CapitalCompany;
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
                ->with('expenseCategory')
                ->with('expenseType')
                ->orderByDesc('id')
                ->get();
        });
    }

    public function listFilteredExpenseItems(?int $expenseCategoryId = null, ?int $expenseTypeId = null)
    {
        return ExpenseItem::query()
            ->when($expenseCategoryId !== null, function ($query) use ($expenseCategoryId) {
                $query->where('expense_category_id', $expenseCategoryId);
            })
            ->when($expenseTypeId !== null, function ($query) use ($expenseTypeId) {
                $query->where('expense_type_id', $expenseTypeId);
            })
            ->get();
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
        ?int $expenseTypeId = null
    ): LengthAwarePaginator {
        $query = ExpenseType::query()
            ->with('expenseCategory')
            ->with('expenseType')
            ->orderByDesc('id');

        if ($expenseCategoryId !== null) {
            $query->where('_id', $expenseCategoryId);
        }

        if ($expenseTypeId !== null) {
            $query->where('_id', $expenseTypeId);
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
        $expenseItem = ExpenseType::query()->create($attributes);
        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseItem->load('expenseCategory', 'expenseType');
    }

    public function updateExpenseItem(ExpenseItem $expenseItem, array $attributes): ExpenseItem
    {
        $expenseItem->update($attributes);
        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseItem->refresh()->load('expenseCategory', 'expenseType');
    }

    public function deleteExpenseItem(ExpenseItem $expenseItem): void
    {
        $expenseItem->delete();
        Cache::forget(self::CACHE_KEY_LIST);
    }
}
