<?php

namespace App\Modules\CFO\Services;

use App\Models\Company;
use App\Support\ActiveCompany;
use App\Support\IndexQuery;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CompanyService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cfo:companies:list';

    /**
     * @return LengthAwarePaginator|Collection<int, Company>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = $this->query($request);

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request, 'id');

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    public function createCompany(array $attributes): Company
    {
        $name = InputNormalizer::text((string) $attributes['name']) ?? '';
        $series = (int) ($attributes['series'] ?? 1);

        $company = DB::transaction(function () use ($name, $series): Company {
            WriteGuard::assertUniqueActive(
                Company::query(),
                'name',
                $name,
                ['series' => $series],
                'name',
                'Perusahaan dengan nama dan seri yang sama sudah terdaftar.'
            );

            return Company::query()->create([
                'name' => $name,
                'series' => $series,
            ]);
        });

        $this->forgetCaches();

        return $company;
    }

    public function updateCompany(Company $company, array $attributes): Company
    {
        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        }

        $updated = DB::transaction(function () use ($company, $attributes): Company {
            $locked = Company::query()->lockForUpdate()->findOrFail($company->getKey());

            $targetName = (string) ($attributes['name'] ?? $locked->name);
            $targetSeries = (int) ($attributes['series'] ?? $locked->series);

            WriteGuard::assertUniqueActive(
                Company::query(),
                'name',
                $targetName,
                ['series' => $targetSeries],
                'name',
                'Perusahaan dengan nama dan seri yang sama sudah terdaftar.',
                $locked->getKey()
            );

            $locked->update($attributes);

            return $locked;
        });

        $refreshed = $updated->refresh();
        ActiveCompany::forgetCompanyCache((int) $refreshed->getKey());
        if (ActiveCompany::id() === (int) $refreshed->getKey()) {
            ActiveCompany::set($refreshed);
        }

        $this->forgetCaches();

        return $refreshed;
    }

    public function deleteCompany(Company $company): void
    {
        $companyId = (int) $company->getKey();

        DB::transaction(function () use ($companyId): void {
            $locked = Company::query()->lockForUpdate()->findOrFail($companyId);

            // Soft-delete every financial/operational child before the parent.
            $locked->expenseItems()->delete();
            $locked->expenseTypes()->delete();
            $locked->expenseCategories()->delete();
            $locked->capitalCompanies()->delete();
            $locked->companyAssets()->delete();

            // Soft-delete CHO/HR dependent records so none remain orphaned.
            $locked->employeeAttendances()->delete();
            $locked->employeeShiftAssignments()->delete();
            $locked->employeeShifts()->delete();
            $locked->employees()->delete();
            $locked->employeePositions()->delete();
            $locked->employmentStatuses()->delete();
            $locked->payrollGrades()->delete();
            $locked->taxStatuses()->delete();

            $locked->delete();
        });

        ActiveCompany::forgetCompanyCache($companyId);
        if ((int) Cache::get(ActiveCompany::GLOBAL_CACHE_KEY) === $companyId) {
            Cache::forget(ActiveCompany::GLOBAL_CACHE_KEY);
        }
        $userId = auth()->id();
        if ($userId !== null && (int) Cache::get(ActiveCompany::cacheKeyForUser((int) $userId)) === $companyId) {
            Cache::forget(ActiveCompany::cacheKeyForUser((int) $userId));
        }
        if (ActiveCompany::id() === $companyId) {
            ActiveCompany::clear();
        }

        $this->forgetCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(Company::class, $request)
            ->allowedFilters([
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'name', $escaped);
                }),
                AllowedFilter::exact('series'),
            ])
            ->allowedSorts(['id', 'name', 'series', 'created_at', 'updated_at'])
            ->allowedIncludes(['capitalCompanies'])
            ->defaultSort('-id');
    }

    private function forgetCaches(): void
    {
        $keys = [
            self::CACHE_KEY_LIST,
            CapitalCompanyService::CACHE_KEY_LIST,
            CompanyAssetService::CACHE_KEY_LIST,
            ExpenseCategoryService::CACHE_KEY_LIST,
            ExpenseTypeService::CACHE_KEY_LIST,
            ExpenseItemService::CACHE_KEY_LIST,
            'erp_foodlab:cho:employees:list',
            'erp_foodlab:cho:employee_positions:list',
            'erp_foodlab:cho:employment_statuses:list',
            'erp_foodlab:cho:payroll_grades:list',
            'erp_foodlab:cho:tax_statuses:list',
            'erp_foodlab:hr:employee_shifts:list',
            'erp_foodlab:hr:employee_shift_assignments:list',
            'erp_foodlab:hr:employee_attendances:list',
        ];

        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }
}
