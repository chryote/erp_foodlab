<?php

namespace App\Modules\CFO\Services;

use App\Models\CapitalCompany;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class CapitalCompanyService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:capital_companies:list';

    public function listCapitalCompanies(): Collection
    {
        return Cache::remember(self::CACHE_KEY_LIST, 60, function () {
            return CapitalCompany::query()
                ->with('company')
                ->orderByDesc('id')
                ->get();
        });
    }

    public function paginateCapitalCompanies(?string $search = null, int $perPage = 10, int $page = 1): LengthAwarePaginator
    {
        $query = CapitalCompany::query()
            ->with('company')
            ->orderByDesc('id');

        if ($search !== null && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('capital', 'like', $term)
                    ->orWhereHas('company', function ($companyQuery) use ($term) {
                        $companyQuery->where('name', 'like', $term)
                            ->orWhere('stakeholder_name', 'like', $term);
                    });
            });
        }

        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    public function createCapitalCompany(array $attributes): CapitalCompany
    {
        $capitalCompany = CapitalCompany::query()->create($attributes);
        Cache::forget(self::CACHE_KEY_LIST);

        return $capitalCompany->load('company');
    }

    public function updateCapitalCompany(CapitalCompany $capitalCompany, array $attributes): CapitalCompany
    {
        $capitalCompany->update($attributes);
        Cache::forget(self::CACHE_KEY_LIST);

        return $capitalCompany->refresh()->load('company');
    }

    public function deleteCapitalCompany(CapitalCompany $capitalCompany): void
    {
        $capitalCompany->delete();
        Cache::forget(self::CACHE_KEY_LIST);
    }
}
