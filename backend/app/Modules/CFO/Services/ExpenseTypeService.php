<?php

namespace App\Modules\CFO\Services;

use App\Models\ExpenseCategory;
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
                ->with(['expenseCategory', 'company'])
                ->orderByDesc('id')
                ->get();
        });
    }

    public function listFilteredExpenseTypes(
        ?int $expenseCategoryId = null,
        ?int $companyId = null
    ): Collection {
        return $this->listExpenseTypes()
            ->when($expenseCategoryId !== null, fn (Collection $types) => $types->where('expense_category_id', $expenseCategoryId))
            ->when($companyId !== null, fn (Collection $types) => $types->where('company_id', $companyId))
            ->values();
    }

    public function listExpenseTypeByExpenseCategory(int $expenseCategoryId, ?int $companyId = null): Collection
    {
        return $this->listFilteredExpenseTypes($expenseCategoryId, $companyId);
    }

    public function paginateExpenseTypes(
        ?string $search = null,
        int $perPage = 10,
        int $page = 1,
        ?int $expenseCategoryId = null,
        ?int $companyId = null
    ): LengthAwarePaginator {
        $query = ExpenseType::query()
            ->with(['expenseCategory', 'company'])
            ->orderByDesc('id');

        if ($expenseCategoryId !== null) {
            $query->where('expense_category_id', $expenseCategoryId);
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
                    });
            });
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function createExpenseType(array $attributes): ExpenseType
    {
        if (empty($attributes['company_id']) && ! empty($attributes['expense_category_id'])) {
            $category = ExpenseCategory::query()->findOrFail($attributes['expense_category_id']);
            $attributes['company_id'] = $category->company_id;
        }

        $expenseType = ExpenseType::query()->create($attributes);
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseItemService::CACHE_KEY_LIST);

        return $expenseType->load(['expenseCategory', 'company']);
    }

    public function updateExpenseType(ExpenseType $expenseType, array $attributes): ExpenseType
    {
        if (empty($attributes['company_id']) && ! empty($attributes['expense_category_id'])) {
            $category = ExpenseCategory::query()->findOrFail($attributes['expense_category_id']);
            $attributes['company_id'] = $category->company_id;
        }

        $expenseType->update($attributes);
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseItemService::CACHE_KEY_LIST);

        return $expenseType->refresh()->load(['expenseCategory', 'company']);
    }

    public function deleteExpenseType(ExpenseType $expenseType): void
    {
        $expenseType->delete();
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseItemService::CACHE_KEY_LIST);
    }
}
