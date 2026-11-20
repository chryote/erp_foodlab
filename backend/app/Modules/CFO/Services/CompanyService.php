<?php

namespace App\Modules\CFO\Services;

use App\Models\Company;
use App\Support\IndexQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CompanyService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:companies:list';

    /**
     * @return LengthAwarePaginator|Collection<int, Company>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = $this->query($request);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    public function createCompany(array $attributes): Company
    {
        $company = DB::transaction(fn (): Company => Company::query()->create([
            'name' => $attributes['name'],
            'series' => (int) ($attributes['series'] ?? 1),
        ]));

        $this->forgetCaches();

        return $company;
    }

    public function updateCompany(Company $company, array $attributes): Company
    {
        $updated = DB::transaction(function () use ($company, $attributes): Company {
            $locked = Company::query()->lockForUpdate()->findOrFail($company->getKey());
            $locked->update($attributes);

            return $locked;
        });

        $this->forgetCaches();

        return $updated->refresh();
    }

    public function deleteCompany(Company $company): void
    {
        DB::transaction(function () use ($company): void {
            $locked = Company::query()->lockForUpdate()->findOrFail($company->getKey());

            // Soft-delete every financial/operational child before the parent.
            $locked->expenseItems()->delete();
            $locked->expenseTypes()->delete();
            $locked->expenseCategories()->delete();
            $locked->capitalCompanies()->delete();
            $locked->delete();
        });

        $this->forgetCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(Company::class, $request)
            ->allowedFilters([
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $query->where('name', 'like', '%'.trim((string) $value).'%');
                }),
                AllowedFilter::exact('series'),
            ])
            ->allowedSorts(['id', 'name', 'series', 'created_at', 'updated_at'])
            ->allowedIncludes(['capitalCompanies'])
            ->defaultSort('-id');
    }

    private function forgetCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CapitalCompanyService::CACHE_KEY_LIST);
        Cache::forget(ExpenseCategoryService::CACHE_KEY_LIST);
        Cache::forget(ExpenseTypeService::CACHE_KEY_LIST);
        Cache::forget(ExpenseItemService::CACHE_KEY_LIST);
    }
}
