<?php

namespace App\Modules\CHO\Services;

use App\Models\Company;
use App\Models\TaxStatus;
use App\Support\IndexQuery;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class TaxStatusService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cho:tax_statuses:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['company'];

    /**
     * @return LengthAwarePaginator|Collection<int, TaxStatus>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

        IndexQuery::applyActiveCompanyFilter($query->getEloquentBuilder(), $request);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(self::CACHE_KEY_LIST, 60, fn () => $query->get());
        }

        return $query->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createTaxStatus(array $attributes): TaxStatus
    {
        $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        if (array_key_exists('code', $attributes)) {
            $attributes['code'] = $attributes['code'] !== null ? InputNormalizer::nullableText((string) $attributes['code']) : null;
        }

        $taxStatus = DB::transaction(function () use ($attributes): TaxStatus {
            $this->assertWriteConstraints(
                (int) $attributes['company_id'],
                $attributes['code'] ?? null,
                $attributes['name']
            );

            return TaxStatus::query()->create($attributes);
        });

        Cache::forget(self::CACHE_KEY_LIST);

        return $taxStatus->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateTaxStatus(TaxStatus $taxStatus, array $attributes): TaxStatus
    {
        if (array_key_exists('name', $attributes)) {
            $attributes['name'] = InputNormalizer::text((string) $attributes['name']) ?? '';
        }
        if (array_key_exists('code', $attributes)) {
            $attributes['code'] = $attributes['code'] !== null ? InputNormalizer::nullableText((string) $attributes['code']) : null;
        }

        $updated = DB::transaction(function () use ($taxStatus, $attributes): TaxStatus {
            $locked = TaxStatus::query()->lockForUpdate()->findOrFail($taxStatus->getKey());

            $targetCompanyId = (int) ($attributes['company_id'] ?? $locked->company_id);
            if ($targetCompanyId !== (int) $locked->company_id && $locked->employees()->exists()) {
                throw ValidationException::withMessages([
                    'company_id' => [
                        'Cannot change company for a tax status that is still referenced by active employees.',
                    ],
                ]);
            }

            $targetCode = array_key_exists('code', $attributes) ? $attributes['code'] : $locked->code;
            $targetName = (string) ($attributes['name'] ?? $locked->name);
            $this->assertWriteConstraints($targetCompanyId, $targetCode, $targetName, $locked);

            $locked->update($attributes);

            return $locked;
        });

        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(EmployeeService::CACHE_KEY_LIST);

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteTaxStatus(TaxStatus $taxStatus): void
    {
        DB::transaction(function () use ($taxStatus): void {
            $locked = TaxStatus::query()->lockForUpdate()->findOrFail($taxStatus->getKey());

            if ($locked->employees()->exists()) {
                throw ValidationException::withMessages([
                    'tax_status' => [
                        'This tax status is still referenced by active employees.',
                    ],
                ]);
            }

            $locked->delete();
        });

        Cache::forget(self::CACHE_KEY_LIST);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(TaxStatus::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_id'),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $query->where(function (Builder $searchQuery) use ($escaped): void {
                        IndexQuery::whereLike($searchQuery, 'code', $escaped);
                        IndexQuery::orWhereLike($searchQuery, 'name', $escaped);
                    });
                }),
            ])
            ->allowedSorts(['id', 'code', 'name', 'created_at'])
            ->allowedIncludes(['employees', 'company'])
            ->defaultSort('code', 'id');
    }

    private function assertWriteConstraints(int $companyId, mixed $code, string $name, ?TaxStatus $existing = null): void
    {
        $companyExists = Company::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($companyId)
            ->exists();

        if (! $companyExists) {
            throw ValidationException::withMessages([
                'company_id' => ['The selected company is invalid or has been deleted.'],
            ]);
        }

        WriteGuard::assertCompanyCodeAndNameUnique(
            TaxStatus::class,
            $companyId,
            $code !== null ? (string) $code : null,
            $name,
            'Status pajak dengan nama yang sama sudah terdaftar pada perusahaan ini.',
            $existing?->getKey()
        );
    }
}
