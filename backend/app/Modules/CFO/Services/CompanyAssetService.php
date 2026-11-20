<?php

namespace App\Modules\CFO\Services;

use App\Models\CompanyAsset;
use App\Support\IndexQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CompanyAssetService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:company_assets:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, CompanyAsset>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    public function createCompanyAsset(array $attributes): CompanyAsset
    {
        $companyAsset = DB::transaction(
            fn (): CompanyAsset => CompanyAsset::query()->create($this->withComputedTotal($attributes))
        );

        Cache::forget(self::CACHE_KEY_LIST);

        return $companyAsset->load(self::RELATIONS);
    }

    public function updateCompanyAsset(CompanyAsset $companyAsset, array $attributes): CompanyAsset
    {
        $updated = DB::transaction(function () use ($companyAsset, $attributes): CompanyAsset {
            $locked = CompanyAsset::query()->lockForUpdate()->findOrFail($companyAsset->getKey());
            $locked->update($this->withComputedTotal($attributes));

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteCompanyAsset(CompanyAsset $companyAsset): void
    {
        DB::transaction(function () use ($companyAsset): void {
            $locked = CompanyAsset::query()->lockForUpdate()->findOrFail($companyAsset->getKey());
            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(CompanyAsset::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where('name', 'like', $term);
                }),
            ])
            ->allowedSorts([
                'id',
                'asset_date',
                'name',
                'amount',
                'price_per_unit',
                'total_price',
                'created_at',
                'updated_at',
            ])
            ->allowedIncludes(self::RELATIONS)
            ->defaultSort('-asset_date', '-id');
    }

    /**
     * `total_price` is derived server-side so a client can never forge it.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function withComputedTotal(array $attributes): array
    {
        $amount = (int) ($attributes['amount'] ?? 1);
        $pricePerUnit = (float) ($attributes['price_per_unit'] ?? 0);

        $attributes['amount'] = $amount;
        $attributes['price_per_unit'] = $pricePerUnit;
        $attributes['total_price'] = round($amount * $pricePerUnit, 2);

        return $attributes;
    }
}
