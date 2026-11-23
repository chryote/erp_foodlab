<?php

namespace App\Support;

use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Context;

/**
 * Holds the active Company selected in the UI secondary tab header
 * for the duration of the current request and persists it per user in cache.
 */
final class ActiveCompany
{
    public const GLOBAL_CACHE_KEY = 'erp_foodlab:active_company:current';

    private static ?Company $current = null;

    private static ?int $currentId = null;

    public static function cacheKeyForUser(int $userId): string
    {
        return "erp_foodlab:active_company:user:{$userId}";
    }

    public static function cacheKeyForCompany(int $companyId): string
    {
        return "erp_foodlab:active_company:model:{$companyId}";
    }

    public static function forgetCompanyCache(?int $companyId): void
    {
        if ($companyId !== null && $companyId > 0) {
            Cache::forget(self::cacheKeyForCompany($companyId));
        }
    }

    public static function set(?Company $company): void
    {
        self::$current = $company;
        self::$currentId = $company?->getKey() !== null ? (int) $company->getKey() : null;

        config([
            'erp.active_company' => $company,
            'erp.active_company_id' => self::$currentId,
        ]);

        $GLOBALS['active_company'] = $company;
        $GLOBALS['active_company_id'] = self::$currentId;

        if ($company !== null) {
            Context::add('active_company_id', self::$currentId);
            Context::add('active_company_name', $company->name);
        } else {
            Context::forget(['active_company_id', 'active_company_name']);
        }
    }

    public static function setById(?int $companyId): ?Company
    {
        if ($companyId === null || $companyId <= 0) {
            self::clear();

            return null;
        }

        $cacheKey = self::cacheKeyForCompany($companyId);
        $company = Cache::remember($cacheKey, 60, fn (): ?Company => Company::query()->find($companyId));

        if ($company === null) {
            Cache::forget($cacheKey);
        }

        self::set($company);

        return $company;
    }

    public static function get(): ?Company
    {
        return self::$current;
    }

    public static function id(): ?int
    {
        return self::$currentId;
    }

    public static function clear(): void
    {
        self::set(null);
    }

    public static function persist(?User $user, ?Company $company): void
    {
        $ttl = now()->addDays(7);

        if ($company === null) {
            if ($user !== null) {
                Cache::forget(self::cacheKeyForUser((int) $user->getKey()));
            }
            Cache::forget(self::GLOBAL_CACHE_KEY);
            self::clear();

            return;
        }

        $companyId = (int) $company->getKey();

        if ($user !== null) {
            Cache::put(self::cacheKeyForUser((int) $user->getKey()), $companyId, $ttl);
        }
        Cache::put(self::GLOBAL_CACHE_KEY, $companyId, $ttl);
        Cache::put(self::cacheKeyForCompany($companyId), $company, 60);
        self::set($company);
    }

    public static function resolveForRequest(Request $request): ?Company
    {
        $headerValue = $request->header('X-Active-Company-Id');
        if (is_string($headerValue) && trim($headerValue) !== '') {
            $parsedId = filter_var(trim($headerValue), FILTER_VALIDATE_INT);
            if ($parsedId !== false && $parsedId > 0) {
                return self::setById((int) $parsedId);
            }

            self::clear();

            return null;
        }

        $user = $request->user();
        if ($user !== null) {
            $userCompanyId = Cache::get(self::cacheKeyForUser((int) $user->getKey()));
            if ($userCompanyId !== null) {
                return self::setById((int) $userCompanyId);
            }
        }

        $globalCompanyId = Cache::get(self::GLOBAL_CACHE_KEY);
        if ($globalCompanyId !== null) {
            return self::setById((int) $globalCompanyId);
        }

        self::clear();

        return null;
    }
}
