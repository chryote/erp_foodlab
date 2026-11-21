<?php

namespace App\Modules\CHO\Services;

use App\Models\TaxStatus;
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

class TaxStatusService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cho:tax_statuses:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, TaxStatus>
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

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createTaxStatus(array $attributes): TaxStatus
    {
        $taxStatus = DB::transaction(
            fn (): TaxStatus => TaxStatus::query()->create($attributes)
        );

        Cache::forget(self::CACHE_KEY_LIST);

        return $taxStatus->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateTaxStatus(TaxStatus $taxStatus, array $attributes): TaxStatus
    {
        $updated = DB::transaction(function () use ($taxStatus, $attributes): TaxStatus {
            $locked = TaxStatus::query()->lockForUpdate()->findOrFail($taxStatus->getKey());
            $locked->update($attributes);

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteTaxStatus(TaxStatus $taxStatus): void
    {
        DB::transaction(function () use ($taxStatus): void {
            $locked = TaxStatus::query()->lockForUpdate()->findOrFail($taxStatus->getKey());

            if ($locked->employees()->exists()) {
                throw ValidationException::withMessages([
                    'tax_status' => [
                        'This tax status is still referenced by active employees.',
                    ],
                ]);
            }

            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(TaxStatus::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $term = '%'.trim((string) $value).'%';

                    $query->where(function (Builder $searchQuery) use ($term): void {
                        $searchQuery
                            ->where('code', 'like', $term)
                            ->orWhere('name', 'like', $term);
                    });
                }),
            ])
            ->allowedSorts(['id', 'code', 'name', 'created_at'])
            ->allowedIncludes(['employees', 'company'])
            ->defaultSort('code', 'id');
    }
}
