<?php

namespace App\Modules\CFO\Services;

use App\Models\Company;
use App\Models\Employee;
use App\Models\ExpenseCategory;
use App\Models\ExpenseItem;
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

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request);

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
            return ExpenseItem::query()->create($this->resolveAndLockParents($attributes));
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $expenseItem->load(self::RELATIONS);
    }

    public function updateExpenseItem(ExpenseItem $expenseItem, array $attributes): ExpenseItem
    {
        $updated = DB::transaction(function () use ($expenseItem, $attributes): ExpenseItem {
            $locked = ExpenseItem::query()->lockForUpdate()->findOrFail($expenseItem->getKey());
            $locked->update($this->resolveAndLockParents($attributes, $locked));

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
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $query->where(function (Builder $searchQuery) use ($escaped): void {
                        IndexQuery::whereLike($searchQuery, 'name', $escaped);
                        IndexQuery::orWhereLike($searchQuery, 'detail', $escaped);
                        $searchQuery->orWhereHas(
                            'expenseCategory',
                            fn (Builder $categoryQuery) => IndexQuery::whereLike($categoryQuery, 'name', $escaped)
                        );
                        $searchQuery->orWhereHas(
                            'expenseType',
                            fn (Builder $typeQuery) => IndexQuery::whereLike($typeQuery, 'name', $escaped)
                        );
                    });
                }),
            ])
            ->allowedSorts(['id', 'name', 'amount', 'purchased_on', 'closing_date', 'created_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('-id');
    }

    /**
     * Lock and validate active parent hierarchy inside the write transaction,
     * deriving `expense_category_id` from the expense type when omitted/null.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function resolveAndLockParents(array $attributes, ?ExpenseItem $existing = null): array
    {
        $companyId = (int) ($attributes['company_id'] ?? $existing?->company_id ?? 0);
        $expenseTypeId = (int) ($attributes['expense_type_id'] ?? $existing?->expense_type_id ?? 0);

        $companyExists = Company::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($companyId)
            ->exists();

        if (! $companyExists) {
            throw ValidationException::withMessages([
                'company_id' => ['The selected company is invalid or has been deleted.'],
            ]);
        }

        $type = ExpenseType::query()
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->sharedLock()
            ->find($expenseTypeId);

        if ($type === null) {
            throw ValidationException::withMessages([
                'expense_type_id' => ['The selected expense type is invalid for this company.'],
            ]);
        }

        $hasExplicitCategory = array_key_exists('expense_category_id', $attributes)
            && $attributes['expense_category_id'] !== null;

        if ($hasExplicitCategory) {
            $categoryId = (int) $attributes['expense_category_id'];
            if ($categoryId !== (int) $type->expense_category_id) {
                throw ValidationException::withMessages([
                    'expense_category_id' => ['The selected expense category does not match the selected expense type.'],
                ]);
            }
        } elseif ($existing === null || array_key_exists('expense_type_id', $attributes) || array_key_exists('expense_category_id', $attributes)) {
            $categoryId = (int) $type->expense_category_id;
            $attributes['expense_category_id'] = $categoryId;
        } else {
            $categoryId = (int) $existing->expense_category_id;
        }

        $categoryExists = ExpenseCategory::query()
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->sharedLock()
            ->whereKey($categoryId)
            ->exists();

        if (! $categoryExists) {
            throw ValidationException::withMessages([
                'expense_category_id' => ['The selected expense category is invalid or has been deleted.'],
            ]);
        }

        $employeeId = array_key_exists('employee_id', $attributes)
            ? $attributes['employee_id']
            : $existing?->employee_id;

        if ($employeeId !== null) {
            $employeeExists = Employee::query()
                ->whereNull('deleted_at')
                ->where('company_id', $companyId)
                ->sharedLock()
                ->whereKey((int) $employeeId)
                ->exists();

            if (! $employeeExists) {
                throw ValidationException::withMessages([
                    'employee_id' => ['The selected employee is invalid for this company.'],
                ]);
            }
        }

        return $attributes;
    }
}
