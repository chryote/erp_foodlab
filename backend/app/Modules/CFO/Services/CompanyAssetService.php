<?php

namespace App\Modules\CFO\Services;

use App\Models\Company;
use App\Models\CompanyAsset;
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

class CompanyAssetService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:company_assets:list';

    private const MAX_DECIMAL_18_2 = 9999999999999999.99;

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

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request);

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
        $companyAsset = DB::transaction(function () use ($attributes): CompanyAsset {
            $this->assertActiveCompany((int) $attributes['company_id']);

            return CompanyAsset::query()->create($this->withComputedTotal($attributes));
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $companyAsset->load(self::RELATIONS);
    }

    public function updateCompanyAsset(CompanyAsset $companyAsset, array $attributes): CompanyAsset
    {
        $updated = DB::transaction(function () use ($companyAsset, $attributes): CompanyAsset {
            $locked = CompanyAsset::query()->lockForUpdate()->findOrFail($companyAsset->getKey());
            $companyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            $this->assertActiveCompany($companyId);

            $locked->update($this->withComputedTotal($attributes, $locked));

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
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'name', $escaped);
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
     * `total_price` is derived server-side so a client can never forge it, and
     * partial PATCH updates preserve omitted `amount` or `price_per_unit` values.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function withComputedTotal(array $attributes, ?CompanyAsset $existing = null): array
    {
        $amount = (int) ($attributes['amount'] ?? $existing?->amount ?? 1);
        $pricePerUnit = (float) ($attributes['price_per_unit'] ?? $existing?->price_per_unit ?? 0);

        $totalPrice = extension_loaded('bcmath')
            ? (float) bcmul((string) $amount, number_format($pricePerUnit, 2, '.', ''), 2)
            : round($amount * $pricePerUnit, 2);

        if ($totalPrice > self::MAX_DECIMAL_18_2) {
            throw ValidationException::withMessages([
                'price_per_unit' => ['The computed total price exceeds the maximum supported decimal(18,2) amount.'],
            ]);
        }

        if (array_key_exists('amount', $attributes) || $existing === null) {
            $attributes['amount'] = $amount;
        }

        if (array_key_exists('price_per_unit', $attributes) || $existing === null) {
            $attributes['price_per_unit'] = round($pricePerUnit, 2);
        }

        $attributes['total_price'] = $totalPrice;

        return $attributes;
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
