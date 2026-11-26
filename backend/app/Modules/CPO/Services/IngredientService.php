<?php

namespace App\Modules\CPO\Services;

use App\Models\DefaultPackage;
use App\Models\Ingredient;
use App\Models\Item;
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
    public function createIngredient(array $attributes): Ingredient
    {
        $attributes['default_package_id'] = (int) $attributes['default_package_id'];
        $attributes['item_id'] = (int) $attributes['item_id'];
        $attributes['price'] = round((float) ($attributes['price'] ?? 0), 2);

        $ingredient = DB::transaction(function () use ($attributes): Ingredient {
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

        $this->forgetDependentCaches();

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

        $updated = DB::transaction(function () use ($ingredient, $attributes): Ingredient {
            $locked = Ingredient::query()->lockForUpdate()->findOrFail($ingredient->getKey());

            $targetDefaultPackageId = (int) ($attributes['default_package_id'] ?? $locked->default_package_id);
            $targetItemId = (int) ($attributes['item_id'] ?? $locked->item_id);

            $this->assertActiveParents($targetDefaultPackageId, $targetItemId);
            $this->assertPairUnique($targetDefaultPackageId, $targetItemId, $locked->getKey());

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetDependentCaches();

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteIngredient(Ingredient $ingredient): void
    {
        DB::transaction(function () use ($ingredient): void {
            $locked = Ingredient::query()->lockForUpdate()->findOrFail($ingredient->getKey());
            $locked->delete();
        });

        $this->forgetDependentCaches();
    }

    private function query(Request $request): QueryBuilder
    {
        return IndexQuery::make(Ingredient::class, $request)
            ->allowedFilters([
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
            ->allowedSorts(['id', 'default_package_id', 'item_id', 'price', 'created_at'])
            ->allowedIncludes(self::RELATIONS)
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

    private function forgetDependentCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CpoService::CACHE_KEY);
        Cache::forget(DefaultPackageService::CACHE_KEY_LIST);
        Cache::forget(ItemService::CACHE_KEY_LIST);
    }
}
