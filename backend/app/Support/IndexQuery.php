<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * Builds the standardized, Spatie-powered list query used by module services.
 *
 * Flat query parameters such as `?search=` and `?company_id=` are kept as
 * backwards-compatible aliases for `?filter[search]` and `?filter[company_id]`.
 */
final class IndexQuery
{
    /**
     * @var array<int, string>
     */
    private const LEGACY_FILTERS = [
        'search',
        'company_id',
        'expense_category_id',
        'expense_type_id',
        'series',
        'status',
        'category',
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
            max(1, (int) ($request->query('per_page') ?? 10)),
            ['*'],
            'page',
            max(1, (int) ($request->query('page') ?? 1))
        );
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
