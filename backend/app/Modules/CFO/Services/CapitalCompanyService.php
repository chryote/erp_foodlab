<?php

namespace App\Modules\CFO\Services;

use App\Models\CapitalCompany;
use App\Models\Company;
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

class CapitalCompanyService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:capital_companies:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, CapitalCompany>
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

    /**
     * Fetch list results together with total_capital, avoiding a duplicate SUM
     * query when the unpaginated collection is already loaded or cached.
     *
     * @return array{items: LengthAwarePaginator|Collection<int, CapitalCompany>, total_capital: float}
     */
    public function listWithTotal(Request $request): array
    {
        $items = $this->list($request);

        $totalCapital = $items instanceof LengthAwarePaginator
            ? $this->totalCapital($request)
            : round((float) $items->sum('capital'), 2);

        return [
            'items' => $items,
            'total_capital' => $totalCapital,
        ];
    }

    public function totalCapital(Request $request): float
    {
        $query = $this->query($request);

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request);

        return round((float) $query->sum('capital'), 2);
    }

    public function createCapitalCompany(array $attributes): CapitalCompany
    {
        $capitalCompany = DB::transaction(function () use ($attributes): CapitalCompany {
            $this->assertActiveCompany((int) $attributes['company_id']);

            return CapitalCompany::query()->create($attributes);
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $capitalCompany->load(self::RELATIONS);
    }

    public function updateCapitalCompany(CapitalCompany $capitalCompany, array $attributes): CapitalCompany
    {
        $updated = DB::transaction(function () use ($capitalCompany, $attributes): CapitalCompany {
            $locked = CapitalCompany::query()->lockForUpdate()->findOrFail($capitalCompany->getKey());
            $companyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            $this->assertActiveCompany($companyId);

            $locked->update($attributes);

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
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
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $raw = trim((string) $value);

                    $query->where(function (Builder $searchQuery) use ($escaped, $raw): void {
                        IndexQuery::whereLike($searchQuery, 'stakeholder_name', $escaped);

                        if (is_numeric($raw)) {
                            $searchQuery->orWhere('capital', '=', round((float) $raw, 2));
                        }

                        $searchQuery->orWhereHas(
                            'company',
                            fn (Builder $companyQuery) => IndexQuery::whereLike($companyQuery, 'name', $escaped)
                        );
                    });
                }),
            ])
            ->allowedSorts(['id', 'stakeholder_name', 'capital', 'created_at', 'updated_at'])
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
}
