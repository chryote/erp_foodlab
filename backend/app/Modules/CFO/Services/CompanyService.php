<?php

namespace App\Modules\CFO\Services;

use App\Models\Company;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class CompanyService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:companies:list';

    public function listCompanies(): Collection
    {
        return Cache::remember(self::CACHE_KEY_LIST, 60, function () {
            return Company::query()
                ->orderByDesc('id')
                ->get();
        });
    }

    public function paginateCompanies(?string $search = null, int $perPage = 10, int $page = 1): LengthAwarePaginator
    {
        $query = Company::query()->orderByDesc('id');

        if ($search !== null && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('stakeholder_name', 'like', $term);
            });
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function createCompany(array $attributes): Company
    {
        $company = Company::query()->create($attributes);
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CapitalCompanyService::CACHE_KEY_LIST);

        return $company;
    }

    public function updateCompany(Company $company, array $attributes): Company
    {
        $company->update($attributes);
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CapitalCompanyService::CACHE_KEY_LIST);

        return $company->refresh();
    }

    public function deleteCompany(Company $company): void
    {
        $company->delete();
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CapitalCompanyService::CACHE_KEY_LIST);
    }
}
