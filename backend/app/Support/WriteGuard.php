<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Shared case-insensitive, soft-delete-aware duplicate guard used by both
 * FormRequests (consistent across MySQL & SQLite) and transactional Services
 * (with sharedLock to close TOCTOU race windows).
 */
final class WriteGuard
{
    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $scopeFilters
     * @return array<string, string>
     */
    public static function findCodeAndNameDuplicateErrors(
        string $modelClass,
        ?string $code,
        ?string $name,
        string $duplicateNameMessage,
        array $scopeFilters = [],
        mixed $ignoreKey = null,
        bool $sharedLock = false,
    ): array {
        $errors = [];

        if ($code !== null && $code !== '' && self::existsCaseInsensitive(
            $modelClass::query(),
            'code',
            $code,
            $scopeFilters,
            $ignoreKey,
            $sharedLock
        )) {
            $errors['code'] = 'The code has already been taken.';
        }

        if ($name !== null && $name !== '' && self::existsCaseInsensitive(
            $modelClass::query(),
            'name',
            $name,
            $scopeFilters,
            $ignoreKey,
            $sharedLock
        )) {
            $errors['name'] = $duplicateNameMessage;
        }

        return $errors;
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $scopeFilters
     */
    public static function assertCodeAndNameUnique(
        string $modelClass,
        ?string $code,
        ?string $name,
        string $duplicateNameMessage,
        array $scopeFilters = [],
        mixed $ignoreKey = null,
        bool $sharedLock = true,
    ): void {
        $errors = self::findCodeAndNameDuplicateErrors(
            $modelClass,
            $code,
            $name,
            $duplicateNameMessage,
            $scopeFilters,
            $ignoreKey,
            $sharedLock
        );

        if ($errors !== []) {
            throw ValidationException::withMessages(
                array_map(static fn (string $message): array => [$message], $errors)
            );
        }
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @return array<string, string>
     */
    public static function findCompanyCodeAndNameDuplicateErrors(
        string $modelClass,
        int $companyId,
        ?string $code,
        ?string $name,
        string $duplicateNameMessage,
        mixed $ignoreKey = null,
        bool $sharedLock = false,
    ): array {
        return self::findCodeAndNameDuplicateErrors(
            $modelClass,
            $code,
            $name,
            $duplicateNameMessage,
            ['company_id' => $companyId],
            $ignoreKey,
            $sharedLock
        );
    }

    /**
     * @param  class-string<Model>  $modelClass
     */
    public static function assertCompanyCodeAndNameUnique(
        string $modelClass,
        int $companyId,
        ?string $code,
        ?string $name,
        string $duplicateNameMessage,
        mixed $ignoreKey = null,
        bool $sharedLock = true,
    ): void {
        self::assertCodeAndNameUnique(
            $modelClass,
            $code,
            $name,
            $duplicateNameMessage,
            ['company_id' => $companyId],
            $ignoreKey,
            $sharedLock
        );
    }

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
