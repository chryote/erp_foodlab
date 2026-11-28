<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Laravel\Scout\Searchable;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * Builds the standardized, Spatie-powered list query used by module services.
 *
 * Flat query parameters such as `?search=` and `?company_id=` are kept as
 * backwards-compatible aliases for `?filter[search]` and `?filter[company_id]`.
 */
final class IndexQuery
{
    public const MAX_PER_PAGE = 100;

    /**
     * @var array<int, string>
     */
    private const LEGACY_FILTERS = [
        'search',
        'company_id',
        'company_owner_id',
        'expense_category_id',
        'expense_type_id',
        'series',
        'status',
        'category',
        'period_date',
        'period_from',
        'period_to',
        'date_from',
        'date_to',
        'daterange',
        'payroll_run_id',
        'payroll_group',
        'packet_id',
        'item_id',
        'type',
        'item_type',
        'code',
        'quantity_min',
        'quantity_max',
        'brand_name',
        'packet_name_id',
        'packet_vendor_id',
        'packet_category_id',
        'item_packet_id',
        'default_package_id',
        'min_price',
        'max_price',
    ];

    /**
     * @param  class-string<\Illuminate\Database\Eloquent\Model>  $modelClass
     */
    public static function make(string $modelClass, Request $request): QueryBuilder
    {
        $queryParams = $request->query();
        $filters = is_array($queryParams['filter'] ?? null) ? $queryParams['filter'] : [];

        foreach (self::LEGACY_FILTERS as $key) {
            if (! array_key_exists($key, $filters) && filled($queryParams[$key] ?? null)) {
                $filters[$key] = $queryParams[$key];
            }
        }

        if ($filters !== []) {
            $queryParams['filter'] = $filters;
        }

        return QueryBuilder::for($modelClass, $request->duplicate(query: $queryParams));
    }

    public static function isPaginated(Request $request): bool
    {
        return $request->query('per_page') !== null || $request->query('page') !== null;
    }

    /**
     * A list may only be cached when the request contains no narrowing options.
     */
    public static function isCacheable(Request $request): bool
    {
        if (self::isPaginated($request)) {
            return false;
        }

        if ($request->boolean('active_company')) {
            return false;
        }

        if ($request->filled('filter') || $request->filled('sort') || $request->filled('include')) {
            return false;
        }

        foreach (self::LEGACY_FILTERS as $key) {
            if ($request->filled($key)) {
                return false;
            }
        }

        return true;
    }

    public static function paginate(QueryBuilder $query, Request $request): LengthAwarePaginator
    {
        return $query->paginate(
            min(self::MAX_PER_PAGE, max(1, (int) ($request->query('per_page') ?? 10))),
            ['*'],
            'page',
            max(1, (int) ($request->query('page') ?? 1))
        );
    }

    public static function escapeLike(mixed $value): ?string
    {
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return null;
        }

        return str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $trimmed);
    }

    public static function whereLike(Builder $query, string $column, string $escapedTerm, string $boolean = 'and'): Builder
    {
        $wrapped = $query->getGrammar()->wrap($column);

        return $query->whereRaw("{$wrapped} LIKE ? ESCAPE '!'", ['%'.$escapedTerm.'%'], $boolean);
    }

    public static function orWhereLike(Builder $query, string $column, string $escapedTerm): Builder
    {
        return self::whereLike($query, $column, $escapedTerm, 'or');
    }

    /**
     * Apply text search using Laravel Scout (Meilisearch / Collection) when enabled
     * on a Searchable model, falling back to SQL LIKE when Scout is disabled or when
     * the search term contains SQL wildcard/literal punctuation (`%`, `_`).
     *
     * @param  callable(Builder, string): void  $likeFallback
     * @param  array<string, int|string|bool>  $scoutFilters
     */
    public static function applySearch(
        Builder $query,
        mixed $value,
        callable $likeFallback,
        array $scoutFilters = [],
        ?Request $request = null
    ): void {
        if (is_array($value)) {
            return;
        }

        $escaped = self::escapeLike($value);
        if ($escaped === null) {
            return;
        }

        $trimmed = trim((string) $value);
        $model = $query->getModel();
        $driver = (string) config('scout.driver', 'null');

        $shouldUseScout = in_array($driver, ['meilisearch', 'collection'], true)
            && in_array(Searchable::class, class_uses_recursive($model), true)
            && strpbrk($trimmed, '%_') === false;

        if (! $shouldUseScout) {
            $likeFallback($query, $escaped);

            return;
        }

        $searchBuilder = $model::search($trimmed)->take(1000);

        $effectiveRequest = $request ?? request();
        if ($effectiveRequest instanceof Request && in_array('company_owner_id', $model->getFillable(), true)) {
            $activeCompanyId = active_company_id();
            if ($activeCompanyId !== null) {
                $scoutFilters['company_owner_id'] = $activeCompanyId;
            } elseif (! array_key_exists('company_owner_id', $scoutFilters)) {
                $requestedOwnerId = $effectiveRequest->input('filter.company_owner_id', $effectiveRequest->query('company_owner_id'));
                if (is_numeric($requestedOwnerId) && (int) $requestedOwnerId > 0) {
                    $scoutFilters['company_owner_id'] = (int) $requestedOwnerId;
                }
            }
        }

        if ($effectiveRequest instanceof Request && in_array('company_id', $model->getFillable(), true)) {
            if ($effectiveRequest->boolean('active_company')) {
                $activeCompanyId = active_company_id();
                if ($activeCompanyId === null) {
                    $query->whereRaw('1 = 0');

                    return;
                }

                $scoutFilters['company_id'] = $activeCompanyId;
            } elseif (! array_key_exists('company_id', $scoutFilters)) {
                $requestedCompanyId = $effectiveRequest->input('filter.company_id', $effectiveRequest->query('company_id'));
                if (is_numeric($requestedCompanyId) && (int) $requestedCompanyId > 0) {
                    $scoutFilters['company_id'] = (int) $requestedCompanyId;
                }
            }
        }

        foreach ($scoutFilters as $field => $filterValue) {
            $searchBuilder->where($field, $filterValue);
        }

        $ids = $searchBuilder->keys()->all();

        if ($ids === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereIn($model->getQualifiedKeyName(), $ids);
    }

    public static function applyActiveCompanyFilter(Builder $query, Request $request, string $column = 'company_id'): Builder
    {
        if (! $request->boolean('active_company')) {
            return $query;
        }

        $activeCompanyId = active_company_id();

        if ($activeCompanyId !== null) {
            return $query->where($column, $activeCompanyId);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * Eager-load default relations unless the client explicitly requested includes.
     *
     * @param  array<int, string>  $relations
     */
    public static function withDefaultRelations(QueryBuilder $query, Request $request, array $relations): QueryBuilder
    {
        if (! $request->filled('include') && $relations !== []) {
            $query->with($relations);
        }

        return $query;
    }
}
