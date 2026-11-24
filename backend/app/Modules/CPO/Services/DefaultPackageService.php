<?php

namespace App\Modules\CPO\Services;

use App\Models\DefaultPackage;
use App\Models\ItemPacket;
use App\Models\PacketCategory;
use App\Models\PacketName;
use App\Models\PacketVendor;
use App\Support\IndexQuery;
use App\Support\InputNormalizer;
use App\Support\WriteGuard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class DefaultPackageService
{
    public const CACHE_KEY_LIST = 'erp_foodlab:cpo:default_packages:list';

    private const CACHE_KEY_INGREDIENTS_LIST = 'erp_foodlab:cpo:ingredients:list';

    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['packetName', 'packetVendor', 'packetCategory', 'itemPacket'];

    /**
     * @return LengthAwarePaginator|Collection<int, DefaultPackage>
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
    public function createDefaultPackage(array $attributes): DefaultPackage
    {
        $attributes['brand_name'] = InputNormalizer::text((string) $attributes['brand_name']) ?? '';
        $attributes['packet_name_id'] = (int) $attributes['packet_name_id'];
        $attributes['packet_vendor_id'] = (int) $attributes['packet_vendor_id'];
        $attributes['packet_category_id'] = (int) $attributes['packet_category_id'];
        $attributes['item_packet_id'] = (int) $attributes['item_packet_id'];
        $attributes['price'] = round((float) ($attributes['price'] ?? 0), 2);

        $defaultPackage = DB::transaction(function () use ($attributes): DefaultPackage {
            $this->assertActiveParents(
                $attributes['packet_name_id'],
                $attributes['packet_vendor_id'],
                $attributes['packet_category_id'],
                $attributes['item_packet_id']
            );

            $this->assertCombinationUnique(
                $attributes['brand_name'],
                $attributes['packet_name_id'],
                $attributes['packet_vendor_id'],
                $attributes['packet_category_id'],
                $attributes['item_packet_id']
            );

            return DefaultPackage::query()->create($attributes);
        });

        $this->forgetDependentCaches();

        return $defaultPackage->load(self::RELATIONS);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateDefaultPackage(DefaultPackage $defaultPackage, array $attributes): DefaultPackage
    {
        if (array_key_exists('brand_name', $attributes)) {
            $attributes['brand_name'] = InputNormalizer::text((string) $attributes['brand_name']) ?? '';
        }

        foreach (['packet_name_id', 'packet_vendor_id', 'packet_category_id', 'item_packet_id'] as $intField) {
            if (array_key_exists($intField, $attributes)) {
                $attributes[$intField] = (int) $attributes[$intField];
            }
        }

        if (array_key_exists('price', $attributes)) {
            $attributes['price'] = round((float) $attributes['price'], 2);
        }

        $updated = DB::transaction(function () use ($defaultPackage, $attributes): DefaultPackage {
            $locked = DefaultPackage::query()->lockForUpdate()->findOrFail($defaultPackage->getKey());

            $targetBrandName = (string) ($attributes['brand_name'] ?? $locked->brand_name);
            $targetPacketNameId = (int) ($attributes['packet_name_id'] ?? $locked->packet_name_id);
            $targetPacketVendorId = (int) ($attributes['packet_vendor_id'] ?? $locked->packet_vendor_id);
            $targetPacketCategoryId = (int) ($attributes['packet_category_id'] ?? $locked->packet_category_id);
            $targetItemPacketId = (int) ($attributes['item_packet_id'] ?? $locked->item_packet_id);

            $this->assertActiveParents(
                $targetPacketNameId,
                $targetPacketVendorId,
                $targetPacketCategoryId,
                $targetItemPacketId
            );

            $this->assertCombinationUnique(
                $targetBrandName,
                $targetPacketNameId,
                $targetPacketVendorId,
                $targetPacketCategoryId,
                $targetItemPacketId,
                $locked->getKey()
            );

            $locked->update($attributes);

            return $locked;
        });

        $this->forgetDependentCaches();

        return $updated->refresh()->load(self::RELATIONS);
    }

    public function deleteDefaultPackage(DefaultPackage $defaultPackage): void
    {
        DB::transaction(function () use ($defaultPackage): void {
            $locked = DefaultPackage::query()->lockForUpdate()->findOrFail($defaultPackage->getKey());
            self::cascadeIngredientsFor([$locked]);
            $locked->delete();
        });

        $this->forgetDependentCaches();
    }

    /**
     * Soft-delete active default packages (and their ingredients if present) for given item_packet IDs.
     *
     * @param  array<int, int>  $itemPacketIds
     */
    public static function softDeleteForItemPacketIds(array $itemPacketIds): void
    {
        if ($itemPacketIds === [] || ! Schema::hasTable('default_packages')) {
            return;
        }

        $defaultPackages = DefaultPackage::query()
            ->whereIn('item_packet_id', $itemPacketIds)
            ->lockForUpdate()
            ->get();

        if ($defaultPackages->isEmpty()) {
            return;
        }

        self::cascadeIngredientsFor($defaultPackages->all());

        DefaultPackage::query()
            ->whereIn('id', $defaultPackages->pluck('id')->all())
            ->delete();
    }

    /**
     * @param  iterable<int, DefaultPackage>  $defaultPackages
     */
    private static function cascadeIngredientsFor(iterable $defaultPackages): void
    {
        if (! class_exists('App\\Models\\Ingredient') || ! Schema::hasTable('ingredients')) {
            return;
        }

        foreach ($defaultPackages as $defaultPackage) {
            if (method_exists($defaultPackage, 'ingredients')) {
                $defaultPackage->ingredients()->delete();
            }
        }
    }

    private function query(Request $request): QueryBuilder
    {
        $query = IndexQuery::make(DefaultPackage::class, $request)
            ->allowedFilters([
                AllowedFilter::callback('brand_name', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    IndexQuery::whereLike($query, 'brand_name', $escaped);
                }),
                AllowedFilter::callback('search', function (Builder $query, mixed $value): void {
                    if (is_array($value)) {
                        return;
                    }

                    $escaped = IndexQuery::escapeLike($value);
                    if ($escaped === null) {
                        return;
                    }

                    $query->where(function (Builder $searchQuery) use ($escaped): void {
                        IndexQuery::whereLike($searchQuery, 'brand_name', $escaped);
                        $searchQuery->orWhereHas(
                            'packetName',
                            fn (Builder $q) => IndexQuery::whereLike($q, 'name', $escaped)
                        );
                        $searchQuery->orWhereHas(
                            'packetVendor',
                            fn (Builder $q) => IndexQuery::whereLike($q, 'name', $escaped)
                        );
                        $searchQuery->orWhereHas(
                            'packetCategory',
                            fn (Builder $q) => IndexQuery::whereLike($q, 'name', $escaped)
                        );
                    });
                }),
                AllowedFilter::exact('packet_name_id'),
                AllowedFilter::exact('packet_vendor_id'),
                AllowedFilter::exact('packet_category_id'),
                AllowedFilter::exact('item_packet_id'),
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
            ->allowedSorts(['id', 'brand_name', 'price', 'created_at'])
            ->defaultSort('brand_name', 'id');

        $availableIncludes = array_values(array_filter([
            'packetName',
            'packetVendor',
            'packetCategory',
            'itemPacket',
            'itemPacket.packet',
            'itemPacket.item',
            class_exists('App\\Models\\Ingredient') ? 'ingredients' : null,
            class_exists('App\\Models\\Ingredient') ? 'ingredients.item' : null,
        ]));

        $query->allowedIncludes($availableIncludes);

        return $query;
    }

    private function assertActiveParents(
        int $packetNameId,
        int $packetVendorId,
        int $packetCategoryId,
        int $itemPacketId
    ): void {
        $checks = [
            'packet_name_id' => [
                PacketName::query()->whereNull('deleted_at')->sharedLock()->whereKey($packetNameId)->exists(),
                'The selected packet name is invalid or has been deleted.',
            ],
            'packet_vendor_id' => [
                PacketVendor::query()->whereNull('deleted_at')->sharedLock()->whereKey($packetVendorId)->exists(),
                'The selected packet vendor is invalid or has been deleted.',
            ],
            'packet_category_id' => [
                PacketCategory::query()->whereNull('deleted_at')->sharedLock()->whereKey($packetCategoryId)->exists(),
                'The selected packet category is invalid or has been deleted.',
            ],
            'item_packet_id' => [
                ItemPacket::query()->whereNull('deleted_at')->sharedLock()->whereKey($itemPacketId)->exists(),
                'The selected item packet is invalid or has been deleted.',
            ],
        ];

        foreach ($checks as $field => [$exists, $message]) {
            if (! $exists) {
                throw ValidationException::withMessages([
                    $field => [$message],
                ]);
            }
        }
    }

    private function assertCombinationUnique(
        string $brandName,
        int $packetNameId,
        int $packetVendorId,
        int $packetCategoryId,
        int $itemPacketId,
        mixed $ignoreKey = null
    ): void {
        WriteGuard::assertUniqueActive(
            DefaultPackage::query(),
            'brand_name',
            $brandName,
            [
                'packet_name_id' => $packetNameId,
                'packet_vendor_id' => $packetVendorId,
                'packet_category_id' => $packetCategoryId,
                'item_packet_id' => $itemPacketId,
            ],
            'brand_name',
            'Paket default dengan kombinasi merek, nama paket, vendor, kategori, dan item paket yang sama sudah terdaftar.',
            $ignoreKey,
            true
        );
    }

    private function forgetDependentCaches(): void
    {
        Cache::forget(self::CACHE_KEY_LIST);
        Cache::forget(CpoService::CACHE_KEY);
        Cache::forget(PacketNameService::CACHE_KEY_LIST);
        Cache::forget(PacketVendorService::CACHE_KEY_LIST);
        Cache::forget(PacketCategoryService::CACHE_KEY_LIST);
        Cache::forget(ItemPacketService::CACHE_KEY_LIST);
        Cache::forget(self::CACHE_KEY_INGREDIENTS_LIST);
    }
}
