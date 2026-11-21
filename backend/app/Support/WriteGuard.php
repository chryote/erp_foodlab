<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/**
 * Shared case-insensitive, soft-delete-aware duplicate guard used by both
 * FormRequests (consistent across MySQL & SQLite) and transactional Services
 * (with sharedLock to close TOCTOU race windows).
 */
final class WriteGuard
{
    /**
     * @param  array<string, mixed>  $scopeFilters
     */
    public static function existsCaseInsensitive(
        Builder $query,
        string $column,
        string $value,
        array $scopeFilters = [],
        mixed $ignoreKey = null,
        bool $sharedLock = false,
    ): bool {
        $normalized = InputNormalizer::text($value) ?? '';
        $wrapped = $query->getGrammar()->wrap($column);

        $query->whereNull('deleted_at');

        foreach ($scopeFilters as $scopeColumn => $scopeValue) {
            if ($scopeValue === null) {
                $query->whereNull($scopeColumn);
            } else {
                $query->where($scopeColumn, $scopeValue);
            }
        }

        $query->whereRaw("LOWER({$wrapped}) = ?", [mb_strtolower($normalized, 'UTF-8')]);

        if ($ignoreKey !== null) {
            $query->whereKeyNot($ignoreKey);
        }

        if ($sharedLock) {
            $query->sharedLock();
        }

        return $query->exists();
    }

    /**
     * @param  array<string, mixed>  $scopeFilters
     */
    public static function assertUniqueActive(
        Builder $query,
        string $column,
        string $value,
        array $scopeFilters,
        string $errorField,
        string $message,
        mixed $ignoreKey = null,
        bool $sharedLock = true,
    ): void {
        if (self::existsCaseInsensitive($query, $column, $value, $scopeFilters, $ignoreKey, $sharedLock)) {
            throw ValidationException::withMessages([
                $errorField => [$message],
            ]);
        }
    }
}
