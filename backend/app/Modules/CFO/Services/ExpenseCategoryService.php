<?php

namespace App\Modules\CFO\Services;

use App\Models\Company;
use App\Models\ExpenseCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ExpenseCategoryService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:expense_categories:list';

    public function listExpenseCategories(): Collection
    {
        return Cache::remember(self::CACHE_KEY_LIST, 60, function () {
            return Company::query()
                ->orderByDesc('id')
                ->get();
        });
    }

    public function paginateExpenseCategories(?string $search = null, int $perPage = 10, int $page = 1): LengthAwarePaginator
    {
        $query = ExpenseCategory::query()->orderByDesc('id');

        if ($search !== null && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $query->where('name', 'like', $term);
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function createExpenseCategory(array $attributes): ExpenseCategory
    {
        $expenseCategory = ExpenseCategory::query()->create($attributes);
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseCategoryService::CACHE_KEY_LIST);

        return $expenseCategory;
    }

    public function updateExpenseCategory(ExpenseCategory $expenseCategory, array $attributes): ExpenseCategory
    {
        $expenseCategory->update($attributes);
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseCategoryService::CACHE_KEY_LIST);

        return $expenseCategory->refresh();
    }

    public function deleteExpenseCategory(ExpenseCategory $expenseCategory): void
    {
        $expenseCategory->delete();
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseCategoryService::CACHE_KEY_LIST);
    }
}
