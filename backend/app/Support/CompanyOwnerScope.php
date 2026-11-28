<?php

namespace App\Support;

use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

/**
 * Resolves, validates, and filters CPO records by `company_owner_id`,
 * defaulting to the active company selected in the UI header tab bar.
 */
final class CompanyOwnerScope
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public static function resolveId(array $attributes = [], ?Model $existing = null): ?int
    {
        if (array_key_exists('company_owner_id', $attributes) && $attributes['company_owner_id'] !== null && $attributes['company_owner_id'] !== '') {
            return (int) $attributes['company_owner_id'];
        }

        $activeCompanyId = active_company_id();
        if ($activeCompanyId !== null) {
            return $activeCompanyId;
        }

        if ($existing !== null) {
            $existingOwnerId = $existing->getAttribute('company_owner_id');
            if ($existingOwnerId !== null) {
                return (int) $existingOwnerId;
            }
        }

        return null;
    }

    public static function resolveForRequest(FormRequest $request, ?Model $existing = null): ?int
    {
        if ($request->has('company_owner_id') && $request->input('company_owner_id') !== null && $request->input('company_owner_id') !== '') {
            return (int) $request->input('company_owner_id');
        }

        $activeCompanyId = active_company_id();
        if ($activeCompanyId !== null) {
            return $activeCompanyId;
        }

        if ($existing !== null) {
            $existingOwnerId = $existing->getAttribute('company_owner_id');
            if ($existingOwnerId !== null) {
                return (int) $existingOwnerId;
            }
        }

        return null;
    }

    public static function applyListFilter(Builder $query, Request $request): ?int
    {
        $activeCompanyId = active_company_id();

        if ($activeCompanyId !== null) {
            $column = $query->getModel()->getTable().'.company_owner_id';
            $query->where($column, $activeCompanyId);

            return $activeCompanyId;
        }

        if ($request->boolean('active_company')) {
            $query->whereRaw('1 = 0');
        }

        return null;
    }

    public static function listCacheKey(string $baseKey, ?int $ownerId): string
    {
        return $ownerId !== null ? "{$baseKey}:owner:{$ownerId}" : $baseKey;
    }

    public static function forgetListCache(string $baseKey, ?int $ownerId = null): void
    {
        Cache::forget($baseKey);

        if ($ownerId !== null) {
            Cache::forget("{$baseKey}:owner:{$ownerId}");
        }

        $activeCompanyId = active_company_id();
        if ($activeCompanyId !== null && $activeCompanyId !== $ownerId) {
            Cache::forget("{$baseKey}:owner:{$activeCompanyId}");
        }
    }

    public static function assertActiveOwner(?int $companyOwnerId, bool $sharedLock = true): void
    {
        if ($companyOwnerId === null) {
            return;
        }

        $query = Company::query()->whereNull('deleted_at');
        if ($sharedLock) {
            $query->sharedLock();
        }

        if (! $query->whereKey($companyOwnerId)->exists()) {
            throw ValidationException::withMessages([
                'company_owner_id' => ['The selected company owner is invalid or has been deleted.'],
            ]);
        }
    }

    /**
     * @return array<string, int>
     */
    public static function scopeFilters(?int $companyOwnerId): array
    {
        return $companyOwnerId !== null ? ['company_owner_id' => $companyOwnerId] : [];
    }
}
