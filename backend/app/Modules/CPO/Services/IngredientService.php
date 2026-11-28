<?php

namespace App\Modules\CPO\Services;

use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
use App\Support\CompanyOwnerScope;
use App\Support\IndexQuery;
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

class IngredientService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:ingredients:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['defaultPackage', 'item'];

    /**
     * @return LengthAwarePaginator|Collection<int, Ingredient>
     */
    public function list(Request $request): LengthAwarePaginator|Collection
    {
        $query = IndexQuery::withDefaultRelations($this->query($request), $request, self::RELATIONS);

        $ownerId = CompanyOwnerScope::applyListFilter($query->getEloquentBuilder(), $request);

        if (IndexQuery::isPaginated($request)) {
            return IndexQuery::paginate($query, $request);
        }

        if (IndexQuery::isCacheable($request)) {
            return Cache::remember(
                CompanyOwnerScope::listCacheKey(self::CACHE_KEY_LIST, $ownerId),
                60,
                fn () => $query->get()
            );
        }

        return $query->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createIngredient(array $attributes): Ingredient
    {
        $attributes['default_package_id'] = (int) $attributes['default_package_id'];
        $attributes['item_id'] = (int) $attributes['item_id'];
        $attributes['price'] = round((float) ($attributes['price'] ?? 0), 2);

        $companyOwnerId = CompanyOwnerScope::resolveId($attributes);
        if ($companyOwnerId !== null) {
            $attributes['company_owner_id'] = $companyOwnerId;
        }

        $ingredient = DB::transaction(function () use ($attributes, $companyOwnerId): Ingredient {
            CompanyOwnerScope::assertActiveOwner($companyOwnerId);
            $this->assertActiveParents(
                $attributes['default_package_id'],
                $attributes['item_id']
            );

            $this->assertPairUnique(
                $attributes['default_package_id'],
                $attributes['item_id']
            );

            return Ingredient::query()->create($attributes);
        });

        $this->forgetDependentCaches($companyOwnerId);

        return $ingredient->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateIngredient(Ingredient $ingredient, array $attributes): Ingredient
    {
        foreach (['default_package_id', 'item_id'] as $intField) {
            if (array_key_exists($intField, $attributes)) {
                $attributes[$intField] = (int) $attributes[$intField];
            }
        }

        if (array_key_exists('price', $attributes)) {
            $attributes['price'] = round((float) $attributes['price'], 2);
        }

        $oldOwnerId = $ingredient->company_owner_id !== null ? (int) $ingredient->company_owner_id : null;

        $updated = DB::transaction(function () use ($ingredient, $attributes): Ingredient {
            $locked = Ingredient::query()->lockForUpdate()->findOrFail($ingredient->getKey());

            $targetOwnerId = CompanyOwnerScope::resolveId($attributes, $locked);
            if ($targetOwnerId !== null && array_key_exists('company_owner_id', $attributes)) {
                $attributes['company_owner_id'] = $targetOwnerId;
            }

            CompanyOwnerScope::assertActiveOwner($targetOwnerId);

            $targetDefaultPackageId = (int) ($attributes['default_package_id'] ?? $locked->default_package_id);
            $targetItemId = (int) ($attributes['item_id'] ?? $locked->item_id);

            $this->assertActiveParents($targetDefaultPackageId, $targetItemId);
            $this->assertPairUnique($targetDefaultPackageId, $targetItemId, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $newOwnerId = $updated->company_owner_id !== null ? (int) $updated->company_owner_id : null;
        $this->forgetDependentCaches($oldOwnerId);
        if ($newOwnerId !== $oldOwnerId) {
            $this->forgetDependentCaches($newOwnerId);
        }

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteIngredient(Ingredient $ingredient): void
    {
        $ownerId = DB::transaction(function () use ($ingredient): ?int {
            $locked = Ingredient::query()->lockForUpdate()->findOrFail($ingredient->getKey());
            $ownerId = $locked->company_owner_id !== null ? (int) $locked->company_owner_id : null;
            $locked->delete();

            return $ownerId;
        });

        $this->forgetDependentCaches($ownerId);
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(Ingredient::class, $request)
            ->allowedFilters([
                AllowedFilter::exact('company_owner_id'),
                AllowedFilter::exact('default_package_id'),
                AllowedFilter::exact('item_id'),
                AllowedFilter::callback('min_price', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if ($trimmed === '' || ! is_numeric($trimmed)) {
                        return;
                    }

                    $query->where('price', '>=', round((float) $trimmed, 2));
                }),
                AllowedFilter::callback('max_price', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $trimmed = trim((string) $value);
                    if ($trimmed === '' || ! is_numeric($trimmed)) {
                        return;
                    }

                    $query->where('price', '<=', round((float) $trimmed, 2));
                }),
            ])
            ->allowedSorts(['id', 'company_owner_id', 'default_package_id', 'item_id', 'price', 'created_at'])
            ->allowedIncludes([...self::RELATIONS, 'companyOwner'])
            ->defaultSort('id');
    }

    private function assertActiveParents(int $defaultPackageId, int $itemId): void
    {
        $defaultPackageExists = DefaultPackage::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($defaultPackageId)
            ->exists();

        if (! $defaultPackageExists) {
            throw ValidationException::withMessages([
                'default_package_id' => ['The selected default package is invalid or has been deleted.'],
            ]);
        }

        $itemExists = Item::query()
            ->whereNull('deleted_at')
            ->sharedLock()
            ->whereKey($itemId)
            ->exists();

        if (! $itemExists) {
            throw ValidationException::withMessages([
                'item_id' => ['The selected item is invalid or has been deleted.'],
            ]);
        }
    }

    private function assertPairUnique(int $defaultPackageId, int $itemId, mixed $ignoreKey = null): void
    {
        WriteGuard::assertUniqueActive(
            Ingredient::query(),
            'item_id',
            (string) $itemId,
            ['default_package_id' => $defaultPackageId],
            'item_id',
            'Item sudah terdaftar pada paket default ini.',
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(?int $ownerId = null): void
    {
        CompanyOwnerScope::forgetListCache(self::CACHE_KEY_LIST, $ownerId);
        Cache::forget(CpoService::CACHE_KEY);
        CompanyOwnerScope::forgetListCache(DefaultPackageService::CACHE_KEY_LIST, $ownerId);
        CompanyOwnerScope::forgetListCache(ItemService::CACHE_KEY_LIST, $ownerId);
    }
}
