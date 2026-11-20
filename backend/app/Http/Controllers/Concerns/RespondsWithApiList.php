<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;

trait RespondsWithApiList
{
    /**
     * @param  class-string<\Illuminate\Http\Resources\Json\JsonResource>  $resourceClass
     * @param  array<string, mixed>  $extraMeta
     */
    protected function respondWithList(
        string $resourceClass,
        LengthAwarePaginator|Collection $result,
        array $extraMeta = []
    ): JsonResponse {
        $paginated = $result instanceof LengthAwarePaginator;

        return response()->json([
            'data' => $resourceClass::collection($paginated ? $result->items() : $result),
            'meta' => array_merge([
                'count' => $paginated ? count($result->items()) : $result->count(),
                'total' => $paginated ? $result->total() : $result->count(),
                'page' => $paginated ? $result->currentPage() : 1,
                'per_page' => $paginated ? $result->perPage() : max(1, $result->count()),
                'last_page' => $paginated ? $result->lastPage() : 1,
            ], $extraMeta),
        ]);
    }
}
