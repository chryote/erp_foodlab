<?php

namespace App\Modules\CFO\Services;

use App\Models\Company;
use App\Models\ExpenseCategory;
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

class ExpenseTypeService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:expense_types:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['expenseCategory', 'company'];

    /**
     * @return LengthAwarePaginator|Collection<int, ExpenseType>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations(
            $this->query($request),
            $request,
            self::RELATIONS
        );

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    public function createExpenseType(array $attributes): ExpenseType
    {
        $expenseType = DB::transaction(function () use ($attributes): ExpenseType {
            $this->assertActiveParents(
                (int) $attributes['company_id'],
                (int) $attributes['expense_category_id']
            );

            return ExpenseType::query()->create($attributes);
        });

        $this->forgetCaches();

        return $expenseType->load(self::RELATIONS);
    }

    public function updateExpenseType(ExpenseType $expenseType, array $attributes): ExpenseType
    {
        $updated = DB::transaction(function () use ($expenseType, $attributes): ExpenseType {
            $locked = ExpenseType::query()->lockForUpdate()->findOrFail($expenseType->getKey());

            $targetCompanyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            $targetCategoryId = (int) ($attributes['expense_category_id'] ?? $locked->expense_category_id);

            if (
                ($targetCompanyId !== (int) $locked->company_id || $targetCategoryId !== (int) $locked->expense_category_id)
                && $locked->expenseItems()->exists()
            ) {
                $field = $targetCompanyId !== (int) $locked->company_id ? 'company_id' : 'expense_category_id';

                throw ValidationException::withMessages([
                    $field => [
                        'Cannot reassign company or category for an expense type that is still referenced by expense items.',
                    ],
                ]);
            }

            $this->assertActiveParents($targetCompanyId, $targetCategoryId);
            $locked->update($attributes);

            return $locked;
        });

        $this->forgetCaches();

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteExpenseType(ExpenseType $expenseType): void
    {
        DB::transaction(function () use ($expenseType): void {
            $locked = ExpenseType::query()->lockForUpdate()->findOrFail($expenseType->getKey());

            if ($locked->expenseItems()->exists()) {
                throw ValidationException::withMessages([
                    'expense_type' => [
                        'This expense type is still referenced by expense items.',
                    ],
                ]);
            }

            $locked->delete();
        });

        $this->forgetCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(ExpenseType::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::exact('expense_category_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $query->where(function (Builder $searchQuery) use ($escaped): void {
                        IndexQuery::whereLike($searchQuery, 'name', $escaped);
                        $searchQuery->orWhereHas(
                            'expenseCategory',
                            fn (Builder $categoryQuery) => IndexQuery::whereLike($categoryQuery, 'name', $escaped)
                        );
                    });
                }),
            ])
            ->allowedSorts(['id', 'name', 'created_at', 'updated_at'])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('-id');
    }

    private function assertActiveParents(int $companyId, int $categoryId): void
    {
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

        $categoryExists = ExpenseCategory::query()
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            ->sharedLock()
            ->whereKey($categoryId)
            ->exists();

        if (! $categoryExists) {
            throw ValidationException::withMessages([
                'expense_category_id' => ['The selected expense category is invalid for this company.'],
            ]);
        }
    }

    private function forgetCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(ExpenseItemService::CACHE_KEY_LIST);
    }
}
