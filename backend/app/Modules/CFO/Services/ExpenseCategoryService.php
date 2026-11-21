<?php

namespace App\Modules\CFO\Services;

use App\Models\Company;
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
     * @var array<int, string>
     */
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, ExpenseCategory>
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

    public function createExpenseCategory(array $attributes): ExpenseCategory
    {
        $expenseCategory = DB::transaction(function () use ($attributes): ExpenseCategory {
            $this->assertActiveCompany((int) $attributes['company_id']);

            return ExpenseCategory::query()->create($attributes);
        });

        $this->forgetCaches();

        return $expenseCategory->load(self::RELATIONS);
    }

    public function updateExpenseCategory(ExpenseCategory $expenseCategory, array $attributes): ExpenseCategory
    {
        $updated = DB::transaction(function () use ($expenseCategory, $attributes): ExpenseCategory {
            $locked = ExpenseCategory::query()->lockForUpdate()->findOrFail($expenseCategory->getKey());

            $targetCompanyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            if ($targetCompanyId !== (int) $locked->company_id && ($locked->expenseTypes()->exists() || $locked->expenseItems()->exists())) {
                throw ValidationException::withMessages([
                    'company_id' => [
                        'Cannot change company for an expense category that is still referenced by expense types or items.',
                    ],
                ]);
            }

            $this->assertActiveCompany($targetCompanyId);
            $locked->update($attributes);

            return $locked;
        });

        $this->forgetCaches();

        return $updated->refresh()->load(self::RELATIONS);
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
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'name', $escaped);
                }),
            ])
            ->allowedSorts(['id', 'name', 'created_at', 'updated_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('-id');
    }

    private function assertActiveCompany(int $companyId): void
    {
        $exists = Company::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($companyId)
            ->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'company_id' => ['The selected company is invalid or has been deleted.'],
            ]);
        }
    }

    private function forgetCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseTypeService::CACHE_KEY_LIST);
        Cache::forget(ExpenseItemService::CACHE_KEY_LIST);
    }
}
