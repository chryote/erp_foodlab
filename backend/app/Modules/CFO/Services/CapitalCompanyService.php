<?php

namespace App\Modules\CFO\Services;

use App\Models\CapitalCompany;
use App\Support\IndexQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CapitalCompanyService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:capital_companies:list';

    /**
     * @return LengthAwarePaginator|Collection<int, CapitalCompany>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, ['company']);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    public function totalCapital(Request $request): float
    {
        return (float) $this->query($request)->sum('capital');
    }

    public function createCapitalCompany(array $attributes): CapitalCompany
    {
        $capitalCompany = DB::transaction(
            fn (): CapitalCompany => CapitalCompany::query()->create($attributes)
        );

        Cache::forget(self::CACHE_KEY_LIST);

        return $capitalCompany->load('company');
    }

    public function updateCapitalCompany(CapitalCompany $capitalCompany, array $attributes): CapitalCompany
    {
        $updated = DB::transaction(function () use ($capitalCompany, $attributes): CapitalCompany {
            $locked = CapitalCompany::query()->lockForUpdate()->findOrFail($capitalCompany->getKey());
            $locked->update($attributes);

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load('company');
    }

    public function deleteCapitalCompany(CapitalCompany $capitalCompany): void
    {
        DB::transaction(function () use ($capitalCompany): void {
            $locked = CapitalCompany::query()->lockForUpdate()->findOrFail($capitalCompany->getKey());
            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(CapitalCompany::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where(function (Builder $searchQuery) use ($term): void {
                        $searchQuery
                            ->where('stakeholder_name', 'like', $term)
                            ->orWhere('capital', 'like', $term)
                            ->orWhereHas(
                                'company',
                                fn (Builder $companyQuery) => $companyQuery->where('name', 'like', $term)
                            );
                    });
                }),
            ])
            ->allowedSorts(['id', 'stakeholder_name', 'capital', 'created_at', 'updated_at'])
            ->allowedIncludes(['company'])
            ->defaultSort('-id');
    }
}
