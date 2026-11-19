<?php

namespace App\Modules\CFO\Services;

use App\Models\CapitalCompany;
use App\Models\ExpenseType;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ExpenseTypeService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:expense_types:list';

    public function listExpenseTypes(): Collection
    {
        return Cache::remember(self::CACHE_KEY_LIST, 60, function () {
            return ExpenseType::query()
                ->with('expenseCategory')
                ->orderByDesc('id')
                ->get();
        });
    }

    public function listExpenseTypeByExpenseCategory(int $expenseCategoryId): Collection
    {
        return $this->listExpenseTypes()
            ->where('expense_category_id', $expenseCategoryId)
            ->values();
    }

    public function paginateExpenseTypes(
        ?string $search = null,
        int $perPage = 10,
        int $page = 1,
        ?int $expenseCategoryId = null
    ): LengthAwarePaginator {
        $query = ExpenseType::query()
            ->with('expenseCategory')
            ->orderByDesc('id');

        if ($expenseCategoryId !== null) {
            $query->where('_id', $expenseCategoryId);
        }

        if ($search !== null && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhereHas('expenseCategory', function ($expenseCategoryQuery) use ($term) {
                        $expenseCategoryQuery->where('name', 'like', $term);
                    });
            });
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function createExpenseType(array $attributes): ExpenseType
    {
        $expenseType = ExpenseType::query()->create($attributes);
        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseType->load('expenseCategory');
    }

    public function updateExpenseType(ExpenseType $expenseType, array $attributes): ExpenseType
    {
        $expenseType->update($attributes);
        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseType->refresh()->load('expenseCategory');
    }

    public function deleteExpenseType(ExpenseType $expenseType): void
    {
        $expenseType->delete();
        Cache::forget(self::CACHE_KEY_LIST);
    }
}
